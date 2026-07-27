import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Check, ChevronRight, CirclePlus, Clock3, FileText, MessageSquareText, Pencil, Send, Sparkles, Trash2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLanguage } from '../i18n/LanguageContext'

type Source = {
  document_id: number
  chunk_index: number
  source: string
  text: string
  score: number
}

type Message = {
  id?: number
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  created_at?: string
  clientId?: string
}

type ConversationSummary = {
  id: number
  title: string
  created_at: string
}

type ConversationDetail = ConversationSummary & {
  messages: Array<Message & { id: number; created_at: string }>
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function parseSseBlock(block: string) {
  const event = block.match(/^event: (.+)$/m)?.[1]
  const data = block.match(/^data: (.+)$/m)?.[1]
  return event && data ? { event, data: JSON.parse(data) } : null
}

export function ChatPage() {
  const { locale, t } = useLanguage()
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editedQuestion, setEditedQuestion] = useState('')
  const [editingConversationId, setEditingConversationId] = useState<number | null>(null)
  const [editedConversationTitle, setEditedConversationTitle] = useState('')

  const orderedMessages = messages
  const sourceCount = messages.reduce((total, message) => total + (message.sources?.length ?? 0), 0)

  function formatDateTime(value?: string) {
    if (!value) return null
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  }

  function createClientId() {
    return `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }

  async function consumeStreamingResponse(
    response: Response,
    assistantClientId: string,
    conversationTitle: string,
    conversationCreatedAt: string,
  ) {
    const reader = response.body?.getReader()
    if (!reader) throw new Error(t('serverResponded', { status: response.status }))

    const decoder = new TextDecoder()
    let pending = ''
    let assistantText = ''

    const consume = (block: string) => {
      const message = parseSseBlock(block)
      if (!message) return
      if (message.event === 'token') {
        assistantText += message.data.text
        setMessages((current) => current.map((item) =>
          item.clientId === assistantClientId ? { ...item, content: assistantText } : item,
        ))
      }
      if (message.event === 'sources') {
        setMessages((current) => current.map((item) =>
          item.clientId === assistantClientId ? { ...item, sources: message.data.items } : item,
        ))
      }
      if (message.event === 'error') setError(message.data.message)
      if (message.event === 'conversation') {
        setConversationId(message.data.id)
        setActiveConversation({ id: message.data.id, title: conversationTitle, created_at: conversationCreatedAt })
      }
      if (message.event === 'done') void loadConversations()
    }

    while (true) {
      const { done, value } = await reader.read()
      pending += decoder.decode(value ?? new Uint8Array(), { stream: !done })
      const events = pending.split('\n\n')
      pending = events.pop() ?? ''
      events.forEach(consume)
      if (done) break
    }
    if (pending) consume(pending)
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  async function loadConversations() {
    try {
      const response = await fetch(`${API_URL}/conversations`)
      if (!response.ok) throw new Error(t('historyUnavailable'))
      setConversations(await response.json())
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('historyUnavailable'))
    }
  }

  async function loadConversation(id: number) {
    if (isSending) return
    setIsLoadingHistory(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/conversations/${id}`)
      if (!response.ok) throw new Error(t('conversationNotFound'))
      const conversation: ConversationDetail = await response.json()
      setConversationId(conversation.id)
      setActiveConversation(conversation)
      setEditingConversationId(null)
      setMessages(conversation.messages)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('unableToLoadConversation'))
    } finally {
      setIsLoadingHistory(false)
    }
  }

  function startNewConversation() {
    if (isSending) return
    setConversationId(null)
    setActiveConversation(null)
    setEditingMessageId(null)
    setEditingConversationId(null)
    setMessages([])
    setQuestion('')
    setError(null)
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault()
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || isSending) return

    setQuestion('')
    setError(null)
    setIsSending(true)
    const createdAt = new Date().toISOString()
    const assistantClientId = createClientId()
    setMessages((current) => [
      ...current,
      { role: 'user', content: trimmedQuestion, created_at: createdAt },
      { role: 'assistant', content: '', created_at: createdAt, clientId: assistantClientId },
    ])

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedQuestion, kb_ids: [], conversation_id: conversationId }),
      })
      if (!response.ok) throw new Error(t('serverResponded', { status: response.status }))
      await consumeStreamingResponse(response, assistantClientId, trimmedQuestion.slice(0, 80), createdAt)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('backendConnectionError'))
    } finally {
      setIsSending(false)
    }
  }

  function beginQuestionEdit(message: Message) {
    if (!message.id || isSending) return
    setEditingMessageId(message.id)
    setEditedQuestion(message.content)
    setError(null)
  }

  function cancelQuestionEdit() {
    setEditingMessageId(null)
    setEditedQuestion('')
  }

  async function saveQuestionEdit(message: Message) {
    const updatedQuestion = editedQuestion.trim()
    if (!conversationId || !message.id || !updatedQuestion || isSending) return

    const messageIndex = messages.findIndex((item) => item.id === message.id)
    if (messageIndex < 0) return
    const createdAt = new Date().toISOString()
    const assistantClientId = createClientId()

    setError(null)
    setIsSending(true)
    setEditingMessageId(null)
    setMessages((current) => {
      const before = current.slice(0, messageIndex)
      const afterQuestion = current.slice(messageIndex + 1)
      const remainingMessages = afterQuestion[0]?.role === 'assistant' ? afterQuestion.slice(1) : afterQuestion
      return [
        ...before,
        { ...current[messageIndex], content: updatedQuestion },
        { role: 'assistant', content: '', created_at: createdAt, clientId: assistantClientId },
        ...remainingMessages,
      ]
    })

    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages/${message.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: updatedQuestion, kb_ids: [] }),
      })
      if (!response.ok) throw new Error(t('questionUpdateFailed'))
      await consumeStreamingResponse(
        response,
        assistantClientId,
        activeConversation?.title ?? updatedQuestion.slice(0, 80),
        activeConversation?.created_at ?? createdAt,
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('questionUpdateFailed'))
      if (conversationId) void loadConversation(conversationId)
    } finally {
      setIsSending(false)
    }
  }

  async function deleteQuestion(message: Message) {
    if (!conversationId || !message.id || isSending || !window.confirm(t('deleteQuestionConfirmation'))) return

    const messageIndex = messages.findIndex((item) => item.id === message.id)
    if (messageIndex < 0) return

    setError(null)
    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages/${message.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(t('questionDeleteFailed'))
      const nextMessages = messages.filter((currentMessage, index) =>
        index !== messageIndex && !(index === messageIndex + 1 && currentMessage.role === 'assistant'),
      )
      setMessages(nextMessages)
      if (nextMessages.length === 0) startNewConversation()
      await loadConversations()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('questionDeleteFailed'))
    }
  }

  function beginConversationRename(conversation: ConversationSummary) {
    if (isSending) return
    setEditingConversationId(conversation.id)
    setEditedConversationTitle(conversation.title)
    setError(null)
  }

  function cancelConversationRename() {
    setEditingConversationId(null)
    setEditedConversationTitle('')
  }

  async function saveConversationRename(conversation: ConversationSummary) {
    const title = editedConversationTitle.trim()
    if (!title || isSending) return

    try {
      const response = await fetch(`${API_URL}/conversations/${conversation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      if (!response.ok) throw new Error(t('conversationRenameFailed'))
      const updatedConversation: ConversationSummary = await response.json()
      setConversations((current) => current.map((item) => item.id === updatedConversation.id ? updatedConversation : item))
      if (activeConversation?.id === updatedConversation.id) setActiveConversation(updatedConversation)
      cancelConversationRename()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('conversationRenameFailed'))
    }
  }

  async function deleteConversation(conversation: ConversationSummary) {
    if (isSending || !window.confirm(t('deleteConversationConfirmation'))) return

    try {
      const response = await fetch(`${API_URL}/conversations/${conversation.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(t('conversationDeleteFailed'))
      if (activeConversation?.id === conversation.id) startNewConversation()
      else setConversations((current) => current.filter((item) => item.id !== conversation.id))
      await loadConversations()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('conversationDeleteFailed'))
    }
  }

  return (
    <section className="page-panel chat-page" aria-label={t('chatWithCoach')}>
      <aside className="history-panel" aria-label={t('conversationHistory')}>
        <div className="history-heading">
          <div>
            <p className="eyebrow">{t('local')}</p>
            <h2>{t('history')}</h2>
          </div>
          <button type="button" className="new-conversation" onClick={startNewConversation} disabled={isSending} title={t('newConversation')}><CirclePlus size={15} />{t('new')}</button>
        </div>
        <div className="history-list">
          {conversations.length === 0 && <p>{t('noSavedConversations')}</p>}
          {conversations.map((conversation) => (
            <div className="history-entry" key={conversation.id}>
              {editingConversationId === conversation.id ? (
                <div className="history-rename">
                  <input value={editedConversationTitle} onChange={(event) => setEditedConversationTitle(event.target.value)} aria-label={t('conversationNamePlaceholder')} maxLength={120} autoFocus />
                  <div>
                    <button type="button" onClick={() => void saveConversationRename(conversation)} disabled={!editedConversationTitle.trim() || isSending} title={t('saveConversationName')}><Check size={14} /></button>
                    <button type="button" onClick={cancelConversationRename} disabled={isSending} title={t('cancelConversationRename')}><X size={14} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className={conversation.id === conversationId ? 'history-item active' : 'history-item'}
                    onClick={() => void loadConversation(conversation.id)}
                    disabled={isSending || isLoadingHistory}
                  >
                    <span>{conversation.title}</span>
                    <small>{formatDateTime(conversation.created_at)}<ChevronRight size={13} /></small>
                  </button>
                  <div className="history-entry-actions">
                    <button type="button" onClick={() => beginConversationRename(conversation)} disabled={isSending} title={t('renameConversation')} aria-label={t('renameConversation')}><Pencil size={13} /></button>
                    <button type="button" className="delete-conversation" onClick={() => void deleteConversation(conversation)} disabled={isSending} title={t('deleteConversation')} aria-label={t('deleteConversation')}><Trash2 size={13} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>
      <div className="conversation-workspace">
        <div className="privacy-note"><span className="privacy-icon"><Sparkles size={16} /></span><span>{t('privacyChat')}</span></div>
        {activeConversation && (
          <section className="conversation-summary" aria-label={t('activeDiscussion')}>
            <div>
              <p className="eyebrow">{t('activeDiscussion')}</p>
              <h2>{activeConversation.title || t('newDiscussion')}</h2>
            </div>
            <div className="conversation-facts">
              <span><CalendarDays size={14} />{t('discussionStarted', { date: formatDateTime(activeConversation.created_at) ?? '' })}</span>
              <span><MessageSquareText size={14} />{t('messageCount', { count: messages.length, plural: messages.length > 1 ? 's' : '' })}</span>
              <span><FileText size={14} />{t('sourceCount', { count: sourceCount, plural: sourceCount > 1 ? 's' : '' })}</span>
            </div>
          </section>
        )}
        <section className="messages" aria-label={t('responseHistory')} aria-live="polite">
          {messages.length === 0 && <p className="empty-state">{t('noAnswersYet')}</p>}
          {orderedMessages.map((message, index) => (
            <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
              <div className="message-meta">
                <p className="message-label">{message.role === 'user' ? t('you') : t('coach')}</p>
                {message.created_at && <span><Clock3 size={12} />{t('sentAt', { date: formatDateTime(message.created_at) ?? '' })}</span>}
              </div>
              {message.role === 'assistant'
                ? (
                  <div className="message-content answer-markdown">
                    {message.content
                      ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      : isSending && <div className="response-loading" role="status" aria-label={t('responseLoading')}><span /><span /><span /></div>}
                    {isSending && index === orderedMessages.length - 1 && message.content && <span className="streaming-indicator" aria-label={t('responseLoading')} />}
                  </div>
                )
                : editingMessageId === message.id
                  ? (
                    <div className="question-edit">
                      <textarea value={editedQuestion} onChange={(event) => setEditedQuestion(event.target.value)} aria-label={t('editQuestionPlaceholder')} rows={3} maxLength={12_000} />
                      <div>
                        <button type="button" className="edit-save" onClick={() => void saveQuestionEdit(message)} disabled={!editedQuestion.trim() || isSending} title={t('saveQuestion')}><Check size={15} /></button>
                        <button type="button" className="edit-cancel" onClick={cancelQuestionEdit} disabled={isSending} title={t('cancelEdit')}><X size={15} /></button>
                      </div>
                    </div>
                  )
                  : <p className="message-content">{message.content}</p>}
              {message.role === 'user' && message.id && editingMessageId !== message.id && (
                <div className="message-actions">
                  <button type="button" onClick={() => beginQuestionEdit(message)} disabled={isSending} title={t('editQuestion')} aria-label={t('editQuestion')}><Pencil size={14} /></button>
                  <button type="button" className="delete-question" onClick={() => void deleteQuestion(message)} disabled={isSending} title={t('deleteQuestion')} aria-label={t('deleteQuestion')}><Trash2 size={14} /></button>
                </div>
              )}
              {message.role === 'assistant' && message.sources && (
                <section className="sources" aria-label={t('sourcesUsed')}>
                  <div className="sources-heading"><p>{t('sourcesUsed')}</p><span>{message.sources.length}</span></div>
                  {message.sources.length === 0
                    ? <span>{t('noRelevantSources')}</span>
                    : message.sources.map((source) => (
                      <details key={`${source.document_id}-${source.chunk_index}`}>
                        <summary>
                          <span className="source-name"><FileText size={15} /><span>{source.source}</span></span>
                          <span className="source-score">{Math.round(source.score * 100)} %</span>
                        </summary>
                        <p>{source.text}</p>
                      </details>
                    ))}
                </section>
              )}
            </article>
          ))}
        </section>
        <section className="chat-composer-panel" aria-label={t('talkToCoach')}>
          <div className="chat-heading">
            <div>
              <p className="eyebrow">{t('assistant')}</p>
              <h2>{t('talkToCoach')}</h2>
            </div>
          </div>
          <form className="composer" onSubmit={sendMessage}>
            <label htmlFor="question">{t('yourQuestion')}</label>
            <textarea id="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t('questionPlaceholder')} rows={3} disabled={isSending} />
            <button type="submit" disabled={!question.trim() || isSending}>{isSending ? t('searching') : <><span>{t('send')}</span><Send size={16} /></>}</button>
          </form>
        </section>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </section>
  )
}
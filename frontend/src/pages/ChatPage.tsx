import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, BrainCircuit, Check, Copy, FileText, LoaderCircle, MessageSquareText, Pencil, ShieldCheck, Sparkles, SquarePen, Trash2, X } from 'lucide-react'
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [availableModels, setAvailableModels] = useState<Array<{id: string; name: string}>>([]
  )
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem('pa-model') ?? '')

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [question])

  const orderedMessages = messages
  const sourceCount = messages.reduce((total, message) => total + (message.sources?.length ?? 0), 0)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
    void loadModels()
  }, [])

  async function loadModels() {
    try {
      const response = await fetch(`${API_URL}/models`)
      if (!response.ok) return
      const models: Array<{id: string; name: string}> = await response.json()
      setAvailableModels(models)
      setSelectedModel((current) => {
        const persisted = localStorage.getItem('pa-model')
        if (persisted && models.some((m) => m.id === persisted)) return persisted
        if (models.length > 0) {
          localStorage.setItem('pa-model', models[0].id)
          return models[0].id
        }
        return current
      })
    } catch {
      // Ollama might be starting up — silently ignore
    }
  }

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
        body: JSON.stringify({ question: trimmedQuestion, kb_ids: [], conversation_id: conversationId, model_id: selectedModel || null }),
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
        body: JSON.stringify({ question: updatedQuestion, kb_ids: [], model_id: selectedModel || null }),
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

  function copyMessageContent(content: string, messageKey: string) {
    void navigator.clipboard.writeText(content).then(() => {
      setCopiedMessageId(messageKey)
      setTimeout(() => setCopiedMessageId(null), 2000)
    })
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
    <div className="chat-layout" aria-label={t('chatWithCoach')}>

      {/* ── Sidebar ── */}
      <aside className="chat-sidebar" aria-label={t('conversationHistory')}>
        <div className="chat-sidebar-header">
          <span className="chat-sidebar-title">Personal Assistant</span>
          <button className="new-chat-btn" type="button" onClick={startNewConversation} disabled={isSending} title={t('newConversation')} aria-label={t('newConversation')}>
            <SquarePen size={15} />
          </button>
        </div>
        <div className="chat-history-list">
          {conversations.length === 0 && <p className="history-empty">{t('noSavedConversations')}</p>}
          {conversations.map((conversation) => (
            <div className="history-entry" key={conversation.id}>
              {editingConversationId === conversation.id ? (
                <div className="history-rename">
                  <input value={editedConversationTitle} onChange={(event) => setEditedConversationTitle(event.target.value)} aria-label={t('conversationNamePlaceholder')} maxLength={120} autoFocus />
                  <div className="history-rename-actions">
                    <button type="button" onClick={() => void saveConversationRename(conversation)} disabled={!editedConversationTitle.trim() || isSending} title={t('saveConversationName')}><Check size={13} /></button>
                    <button type="button" onClick={cancelConversationRename} disabled={isSending} title={t('cancelConversationRename')}><X size={13} /></button>
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
                    <span className="history-item-title">{conversation.title}</span>
                    <span className="history-item-date">{formatDateTime(conversation.created_at)}</span>
                  </button>
                  <div className="history-entry-actions">
                    <button type="button" onClick={() => beginConversationRename(conversation)} disabled={isSending} title={t('renameConversation')} aria-label={t('renameConversation')}><Pencil size={12} /></button>
                    <button type="button" className="delete-conversation" onClick={() => void deleteConversation(conversation)} disabled={isSending} title={t('deleteConversation')} aria-label={t('deleteConversation')}><Trash2 size={12} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="chat-sidebar-footer">
          <div className="privacy-badge"><ShieldCheck size={12} /><span>{t('localPrivate')}</span></div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="chat-main">
        {activeConversation && (
          <div className="convo-banner">
            <span className="convo-banner-title">{activeConversation.title}</span>
            <div className="convo-banner-facts">
              <span><MessageSquareText size={13} />{t('messageCount', { count: messages.length, plural: messages.length > 1 ? 's' : '' })}</span>
              <span><FileText size={13} />{t('sourceCount', { count: sourceCount, plural: sourceCount > 1 ? 's' : '' })}</span>
            </div>
          </div>
        )}

        <div className="messages-scroll" ref={scrollRef} aria-label={t('responseHistory')} aria-live="polite">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="chat-welcome-icon"><Sparkles size={26} strokeWidth={1.8} /></div>
              <h2>Personal Assistant</h2>
              <p>{t('noAnswersYet')}</p>
            </div>
          ) : (
            <div className="messages-column">
              {orderedMessages.map((message, index) => (
                <div className={`msg-row ${message.role}`} key={`${message.role}-${index}`}>
                  {message.role === 'assistant' && (
                    <div className="msg-avatar" aria-hidden="true"><Sparkles size={14} strokeWidth={2.2} /></div>
                  )}
                  {message.role === 'user' ? (
                    <div className="msg-user-wrap">
                      {editingMessageId === message.id ? (
                        <div className="question-edit">
                          <textarea value={editedQuestion} onChange={(event) => setEditedQuestion(event.target.value)} aria-label={t('editQuestionPlaceholder')} rows={3} maxLength={12_000} />
                          <div className="question-edit-actions">
                            <button type="button" className="edit-save" onClick={() => void saveQuestionEdit(message)} disabled={!editedQuestion.trim() || isSending} title={t('saveQuestion')}><Check size={14} /></button>
                            <button type="button" className="edit-cancel" onClick={cancelQuestionEdit} disabled={isSending} title={t('cancelEdit')}><X size={14} /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="msg-user-bubble">{message.content}</p>
                          {message.id && editingMessageId !== message.id && (
                            <div className="msg-user-actions">
                              <button type="button" onClick={() => beginQuestionEdit(message)} disabled={isSending} title={t('editQuestion')} aria-label={t('editQuestion')}><Pencil size={13} /></button>
                              <button type="button" className="delete-question" onClick={() => void deleteQuestion(message)} disabled={isSending} title={t('deleteQuestion')} aria-label={t('deleteQuestion')}><Trash2 size={13} /></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="msg-assistant-body">
                      {message.content ? (
                        <div className="answer-markdown">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                          {isSending && index === orderedMessages.length - 1 && <span className="streaming-indicator" aria-label={t('responseLoading')} />}
                        </div>
                      ) : isSending ? (
                        <div className="response-loading" role="status" aria-label={t('responseLoading')}><span /><span /><span /></div>
                      ) : null}
                      {message.content && !isSending && (
                        <div className="msg-assistant-actions">
                          <button
                            type="button"
                            className={copiedMessageId === `${message.role}-${index}` ? 'msg-copy-btn copied' : 'msg-copy-btn'}
                            onClick={() => copyMessageContent(message.content, `${message.role}-${index}`)}
                            title={t('copyMessage')}
                            aria-label={t('copyMessage')}
                          >
                            {copiedMessageId === `${message.role}-${index}` ? <><Check size={13} /><span>{t('copied')}</span></> : <><Copy size={13} /><span>{t('copyMessage')}</span></>}
                          </button>
                        </div>
                      )}
                      {message.sources && (
                        <section className="sources-section" aria-label={t('sourcesUsed')}>
                          {message.sources.length === 0 ? (
                            <p className="no-sources">{t('noRelevantSources')}</p>
                          ) : (
                            <>
                              <div className="sources-header">
                                <span className="sources-label">{t('sourcesUsed')}</span>
                                <span className="sources-count">{message.sources.length}</span>
                              </div>
                              <div className="sources-list">
                                {message.sources.map((source) => (
                                  <details className="source-item" key={`${source.document_id}-${source.chunk_index}`}>
                                    <summary>
                                      <span className="source-name"><FileText size={14} /><span>{source.source}</span></span>
                                      <span className="source-score">{Math.round(source.score * 100)} %</span>
                                    </summary>
                                    <p className="source-text">{source.text}</p>
                                  </details>
                                ))}
                              </div>
                            </>
                          )}
                        </section>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="chat-input-bar">
          <div className="chat-input-inner">
            {error && <p className="chat-error" role="alert">{error}</p>}
            <form className="chat-input-form" onSubmit={sendMessage}>
              <textarea
                ref={textareaRef}
                id="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={t('questionPlaceholder')}
                rows={1}
                disabled={isSending}
                aria-label={t('yourQuestion')}
              />
              <div className="chat-input-toolbar">
                {availableModels.length > 0 ? (
                  <div className="model-dropdown-wrap" ref={modelDropdownRef}>
                    <button
                      type="button"
                      className={isModelDropdownOpen ? 'model-chip model-chip-open' : 'model-chip'}
                      onClick={() => !isSending && setIsModelDropdownOpen((prev) => !prev)}
                      disabled={isSending}
                      aria-haspopup="listbox"
                      aria-expanded={isModelDropdownOpen}
                      aria-label={t('selectModel')}
                    >
                      <BrainCircuit size={13} className="model-chip-icon" />
                      <span className="model-chip-name">{selectedModel}</span>
                      <svg className={isModelDropdownOpen ? 'model-chip-arrow model-chip-arrow-open' : 'model-chip-arrow'} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    {isModelDropdownOpen && (
                      <div className="model-dropdown-panel" role="listbox" aria-label={t('selectModel')}>
                        <p className="model-dropdown-heading">{t('selectModel')}</p>
                        <div className="model-dropdown-list">
                          {availableModels.map((model) => (
                            <button
                              key={model.id}
                              type="button"
                              role="option"
                              aria-selected={model.id === selectedModel}
                              className={model.id === selectedModel ? 'model-dropdown-item model-dropdown-item-selected' : 'model-dropdown-item'}
                              onClick={() => { setSelectedModel(model.id); localStorage.setItem('pa-model', model.id); setIsModelDropdownOpen(false); }}
                            >
                              <span className="model-dropdown-check">{model.id === selectedModel && <Check size={13} />}</span>
                              <span className="model-dropdown-name">{model.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : <span />}
                <button className="chat-input-send" type="submit" disabled={!question.trim() || isSending} aria-label={isSending ? t('searching') : t('send')} title={isSending ? t('searching') : t('send')}>
                  {isSending ? <LoaderCircle className="send-loading" size={16} aria-hidden="true" /> : <ArrowUp size={16} aria-hidden="true" />}
                </button>
              </div>
            </form>
            <p className="chat-input-hint">{t('privacyChat')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Check, Database, FileUp, FolderPlus, Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

type KnowledgeBase = {
  id: number
  name: string
  description: string
  created_at: string
  document_count: number
}

export function KnowledgeBasesPage() {
  const { t } = useLanguage()
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [selectedKbId, setSelectedKbId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editedName, setEditedName] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [note, setNote] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isIngesting, setIsIngesting] = useState(false)
  const [isSavingBase, setIsSavingBase] = useState(false)

  const selectedBase = knowledgeBases.find((knowledgeBase) => knowledgeBase.id === selectedKbId) ?? null

  useEffect(() => {
    void loadKnowledgeBases()
  }, [])

  async function loadKnowledgeBases(preferredId?: number) {
    try {
      const response = await fetch(`${API_URL}/knowledge-bases`)
      if (!response.ok) throw new Error(t('basesUnavailable'))
      const bases: KnowledgeBase[] = await response.json()
      setKnowledgeBases(bases)
      const nextId = preferredId ?? selectedKbId
      const nextBase = bases.find((base) => base.id === nextId) ?? bases[0] ?? null
      selectBase(nextBase)
    } catch (caughtError) {
      setStatusMessage(caughtError instanceof Error ? caughtError.message : t('basesUnavailable'))
    }
  }

  function selectBase(knowledgeBase: KnowledgeBase | null) {
    setSelectedKbId(knowledgeBase?.id ?? null)
    setEditedName(knowledgeBase?.name ?? '')
    setEditedDescription(knowledgeBase?.description ?? '')
    setNote('')
    setSelectedFile(null)
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null)
    setNote('')
    setStatusMessage(null)
  }

  async function createKnowledgeBase(event: FormEvent) {
    event.preventDefault()
    if (!newName.trim() || isSavingBase) return
    setIsSavingBase(true)
    setStatusMessage(null)
    try {
      const response = await fetch(`${API_URL}/knowledge-bases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() }),
      })
      const created = await response.json()
      if (!response.ok) throw new Error(created.detail ?? t('creationFailed'))
      setNewName('')
      setNewDescription('')
      await loadKnowledgeBases(created.id)
      setStatusMessage(t('createdBase', { name: created.name }))
    } catch (caughtError) {
      setStatusMessage(caughtError instanceof Error ? caughtError.message : t('creationFailed'))
    } finally {
      setIsSavingBase(false)
    }
  }

  async function saveKnowledgeBase(event: FormEvent) {
    event.preventDefault()
    if (!selectedBase || !editedName.trim() || isSavingBase) return
    setIsSavingBase(true)
    setStatusMessage(null)
    try {
      const response = await fetch(`${API_URL}/knowledge-bases/${selectedBase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName.trim(), description: editedDescription.trim() }),
      })
      const updated = await response.json()
      if (!response.ok) throw new Error(updated.detail ?? t('updateFailed'))
      await loadKnowledgeBases(updated.id)
      setStatusMessage(t('baseUpdated'))
    } catch (caughtError) {
      setStatusMessage(caughtError instanceof Error ? caughtError.message : t('updateFailed'))
    } finally {
      setIsSavingBase(false)
    }
  }

  async function deleteKnowledgeBase() {
    if (!selectedBase || isSavingBase) return
    if (!window.confirm(t('deleteConfirmation', { name: selectedBase.name, count: selectedBase.document_count, plural: selectedBase.document_count > 1 ? 's' : '' }))) return
    setIsSavingBase(true)
    setStatusMessage(null)
    try {
      const response = await fetch(`${API_URL}/knowledge-bases/${selectedBase.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.detail ?? t('deletionFailed'))
      }
      await loadKnowledgeBases()
      setStatusMessage(t('baseDeleted'))
    } catch (caughtError) {
      setStatusMessage(caughtError instanceof Error ? caughtError.message : t('deletionFailed'))
    } finally {
      setIsSavingBase(false)
    }
  }

  async function ingestContent(event: FormEvent) {
    event.preventDefault()
    if ((!note.trim() && !selectedFile) || isIngesting || !selectedBase) return

    setIsIngesting(true)
    setStatusMessage(null)
    try {
      const formData = new FormData()
      formData.append('kb_id', String(selectedBase.id))
      if (selectedFile) formData.append('file', selectedFile)
      else formData.append('note', note.trim())
      const response = await fetch(`${API_URL}/ingest`, { method: 'POST', body: formData })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail ?? t('serverResponded', { status: response.status }))
      setStatusMessage(t('indexedContent', { filename: result.filename, name: selectedBase.name, count: result.chunks_indexed, plural: result.chunks_indexed > 1 ? 's' : '' }))
      setNote('')
      setSelectedFile(null)
      const input = document.getElementById('document-upload') as HTMLInputElement | null
      if (input) input.value = ''
      await loadKnowledgeBases(selectedBase.id)
    } catch (caughtError) {
      setStatusMessage(caughtError instanceof Error ? caughtError.message : t('ingestionFailed'))
    } finally {
      setIsIngesting(false)
    }
  }

  return (
    <section className="page-panel knowledge-page" aria-label={t('knowledgeBase')}>
      <div className="privacy-note"><span className="privacy-icon"><Database size={16} /></span><span>{t('privacyKnowledge')}</span></div>
      <div className="knowledge-layout">
        <aside className="base-list-panel" aria-label={t('knowledgeBaseList')}>
          <div className="base-list-heading">
            <div>
              <p className="eyebrow">{t('organization')}</p>
              <h2>{t('myBases')}</h2>
            </div>
          </div>
          <div className="base-list">
            {knowledgeBases.length === 0 && <p>{t('noBases')}</p>}
            {knowledgeBases.map((knowledgeBase) => (
              <button
                type="button"
                className={knowledgeBase.id === selectedKbId ? 'base-item active' : 'base-item'}
                key={knowledgeBase.id}
                onClick={() => selectBase(knowledgeBase)}
              >
                <span>{knowledgeBase.name}</span>
                <small>{t('documentCount', { count: knowledgeBase.document_count, plural: knowledgeBase.document_count > 1 ? 's' : '' })}</small>
              </button>
            ))}
          </div>
          <form className="create-base-form" onSubmit={createKnowledgeBase}>
            <label htmlFor="new-base-name">{t('newBase')}</label>
            <input id="new-base-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={t('baseNamePlaceholder')} maxLength={120} />
            <textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder={t('optionalDescription')} rows={2} maxLength={500} />
            <button type="submit" disabled={!newName.trim() || isSavingBase}><FolderPlus size={15} />{t('createBase')}</button>
          </form>
        </aside>

        <div className="base-workspace">
          {selectedBase ? (
            <>
              <form className="knowledge-form" onSubmit={saveKnowledgeBase}>
                <div className="knowledge-heading">
                  <div>
                    <p className="eyebrow">{t('selectedBase')}</p>
                    <h2>{t('editBase')}</h2>
                  </div>
                  <span>{t('documentCount', { count: selectedBase.document_count, plural: selectedBase.document_count > 1 ? 's' : '' })}</span>
                </div>
                <label htmlFor="base-name">{t('name')}</label>
                <input id="base-name" value={editedName} onChange={(event) => setEditedName(event.target.value)} maxLength={120} />
                <label htmlFor="base-description">{t('description')}</label>
                <textarea id="base-description" value={editedDescription} onChange={(event) => setEditedDescription(event.target.value)} rows={2} maxLength={500} />
                <div className="base-actions">
                  <button type="submit" disabled={!editedName.trim() || isSavingBase}><Check size={15} />{t('save')}</button>
                  <button type="button" className="danger-button" onClick={() => void deleteKnowledgeBase()} disabled={isSavingBase}><Trash2 size={15} />{t('delete')}</button>
                </div>
              </form>

              <form className="knowledge-form" onSubmit={ingestContent}>
                <div className="knowledge-heading">
                  <div>
                    <p className="eyebrow">{t('content')}</p>
                    <h2>{t('addKnowledge')}</h2>
                  </div>
                  <span>{t('supportedFiles')}</span>
                </div>
                <textarea
                  value={note}
                  onChange={(event) => { setNote(event.target.value); setSelectedFile(null); setStatusMessage(null) }}
                  placeholder={t('notePlaceholder')}
                  rows={7}
                  disabled={isIngesting || Boolean(selectedFile)}
                />
                <div className="upload-row">
                  <label className="upload-control" htmlFor="document-upload"><FileUp size={16} />{t('chooseFile')}</label>
                  <input id="document-upload" type="file" accept=".pdf,.docx,.txt,.md" onChange={onFileChange} disabled={isIngesting} />
                  <span className="file-name">{selectedFile?.name ?? t('noFileSelected')}</span>
                  <button type="submit" disabled={(!note.trim() && !selectedFile) || isIngesting}>{isIngesting ? t('indexing') : <><Plus size={16} />{t('index')}</>}</button>
                </div>
              </form>
            </>
          ) : <p className="empty-state">{t('createBaseToStart')}</p>}
          {statusMessage && <p className="ingestion-status" role="status">{statusMessage}</p>}
        </div>
      </div>
    </section>
  )
}
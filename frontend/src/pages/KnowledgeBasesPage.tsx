import { useEffect, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { Check, Database, FileUp, FolderPlus, Plus, Trash2, X } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

type KnowledgeBase = {
  id: number
  name: string
  description: string
  created_at: string
  document_count: number
}

type IngestBatchResponse = {
  documents: Array<{
    filename: string
    chunks_indexed: number
  }>
  chunks_indexed: number
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
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
    setSelectedFiles([])
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(event.target.files ?? []))
    setNote('')
    setStatusMessage(null)
    event.target.value = ''
  }

  function onFilesDropped(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingFiles(false)
    if (isIngesting) return
    setSelectedFiles(Array.from(event.dataTransfer.files))
    setNote('')
    setStatusMessage(null)
  }

  function removeSelectedFile(index: number) {
    setSelectedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))
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
    if ((!note.trim() && selectedFiles.length === 0) || isIngesting || !selectedBase) return

    setIsIngesting(true)
    setStatusMessage(null)
    try {
      const formData = new FormData()
      formData.append('kb_id', String(selectedBase.id))
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file) => formData.append('files', file))
      }
      else formData.append('note', note.trim())
      const response = await fetch(`${API_URL}/ingest`, { method: 'POST', body: formData })
      const result: IngestBatchResponse & { detail?: string } = await response.json()
      if (!response.ok) throw new Error(result.detail ?? t('serverResponded', { status: response.status }))
      const filenames = result.documents.map((document) => document.filename).join(', ')
      setStatusMessage(t('indexedContent', { filename: filenames, name: selectedBase.name, count: result.chunks_indexed, plural: result.chunks_indexed > 1 ? 's' : '' }))
      setNote('')
      setSelectedFiles([])
      await loadKnowledgeBases(selectedBase.id)
    } catch (caughtError) {
      setStatusMessage(caughtError instanceof Error ? caughtError.message : t('ingestionFailed'))
    } finally {
      setIsIngesting(false)
    }
  }

  return (
    <div className="kb-layout" aria-label={t('knowledgeBase')}>

      {/* ── Sidebar ── */}
      <aside className="kb-sidebar" aria-label={t('knowledgeBaseList')}>
        <div className="kb-sidebar-header">
          <p className="kb-eyebrow">{t('organization')}</p>
          <h2 className="kb-sidebar-heading">{t('myBases')}</h2>
        </div>
        <div className="kb-item-list">
          {knowledgeBases.length === 0 && <p className="kb-item-empty">{t('noBases')}</p>}
          {knowledgeBases.map((knowledgeBase) => (
            <button
              type="button"
              className={knowledgeBase.id === selectedKbId ? 'kb-item active' : 'kb-item'}
              key={knowledgeBase.id}
              onClick={() => selectBase(knowledgeBase)}
            >
              <span className="kb-item-name">{knowledgeBase.name}</span>
              <span className="kb-item-meta">{t('documentCount', { count: knowledgeBase.document_count, plural: knowledgeBase.document_count > 1 ? 's' : '' })}</span>
            </button>
          ))}
        </div>
        <form className="kb-create-form" onSubmit={createKnowledgeBase}>
          <p className="kb-create-label">{t('newBase')}</p>
          <input className="create-field-input" id="new-base-name" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={t('baseNamePlaceholder')} maxLength={120} />
          <textarea className="create-field-textarea" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder={t('optionalDescription')} rows={2} maxLength={500} />
          <button className="btn-primary btn-primary-full" type="submit" disabled={!newName.trim() || isSavingBase}><FolderPlus size={14} />{t('createBase')}</button>
        </form>
      </aside>

      {/* ── Main ── */}
      <div className="kb-main">
        <div className="kb-privacy-banner"><Database size={14} /><span>{t('privacyKnowledge')}</span></div>

        {selectedBase ? (
          <>
            <div className="kb-card-grid">
              <div className="form-card kb-card-edit">
              <div className="form-card-header">
                <span className="form-card-title">{t('editBase')}</span>
                <span className="form-card-sub">{t('documentCount', { count: selectedBase.document_count, plural: selectedBase.document_count > 1 ? 's' : '' })}</span>
              </div>
              <form className="form-card-body" onSubmit={saveKnowledgeBase}>
                <div>
                  <label className="field-label" htmlFor="base-name">{t('name')}</label>
                  <input className="field-input" id="base-name" value={editedName} onChange={(event) => setEditedName(event.target.value)} maxLength={120} />
                </div>
                <div>
                  <label className="field-label" htmlFor="base-description">{t('description')}</label>
                  <textarea className="field-textarea" id="base-description" value={editedDescription} onChange={(event) => setEditedDescription(event.target.value)} rows={2} maxLength={500} />
                </div>
                <div className="form-actions">
                  <button className="btn-primary" type="submit" disabled={!editedName.trim() || isSavingBase}><Check size={14} />{t('save')}</button>
                  <button className="btn-danger" type="button" onClick={() => void deleteKnowledgeBase()} disabled={isSavingBase}><Trash2 size={14} />{t('delete')}</button>
                </div>
              </form>
            </div>

            <div className="form-card kb-card-ingest">
              <div className="form-card-header">
                <span className="form-card-title">{t('addKnowledge')}</span>
                <span className="form-card-sub">{t('supportedFiles')}</span>
              </div>
              <form className="form-card-body" onSubmit={ingestContent}>
                <textarea
                  className="field-textarea"
                  value={note}
                  onChange={(event) => { setNote(event.target.value); setSelectedFiles([]); setStatusMessage(null) }}
                  placeholder={t('notePlaceholder')}
                  rows={6}
                  disabled={isIngesting || selectedFiles.length > 0}
                />
                <div
                  className={isDraggingFiles ? 'drop-zone is-dragging' : 'drop-zone'}
                  onDragEnter={(event) => { event.preventDefault(); if (!isIngesting) setIsDraggingFiles(true) }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDraggingFiles(false) }}
                  onDrop={onFilesDropped}
                >
                  <FileUp size={20} aria-hidden="true" />
                  <div className="drop-zone-content">
                    <span className="drop-zone-title">{t('chooseFile')}</span>
                    <span className="drop-zone-hint">{t('supportedFiles')}</span>
                  </div>
                  <label className="upload-label" htmlFor="document-upload">{t('chooseFile')}</label>
                  <input className="upload-input" id="document-upload" type="file" multiple accept=".pdf,.docx,.txt,.md" onChange={onFileChange} disabled={isIngesting} />
                </div>
                {selectedFiles.length > 0 && <ul className="selected-file-list" aria-label={t('documentCount', { count: selectedFiles.length, plural: selectedFiles.length > 1 ? 's' : '' })}>
                  {selectedFiles.map((file, index) => <li className="selected-file" key={`${file.name}-${file.lastModified}-${index}`}>
                    <span>{file.name}</span>
                    <button type="button" className="selected-file-remove" onClick={() => removeSelectedFile(index)} disabled={isIngesting} aria-label={`${t('delete')} ${file.name}`}><X size={14} /></button>
                  </li>)}
                </ul>}
                <div className="upload-row">
                  <span className="upload-filename">{selectedFiles.length > 0 ? t('documentCount', { count: selectedFiles.length, plural: selectedFiles.length > 1 ? 's' : '' }) : t('noFileSelected')}</span>
                  <button className="btn-primary" type="submit" disabled={(!note.trim() && selectedFiles.length === 0) || isIngesting}>{isIngesting ? t('indexing') : <><Plus size={15} />{t('index')}</>}</button>
                </div>
              </form>
            </div>
            </div>
          </>
        ) : (
          <div className="kb-empty-state"><p>{t('createBaseToStart')}</p></div>
        )}
        {statusMessage && <p className="status-msg" role="status">{statusMessage}</p>}
      </div>
    </div>
  )
}
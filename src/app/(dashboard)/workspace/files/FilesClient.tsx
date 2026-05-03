'use client'

import { useState, useEffect, useRef } from 'react'
import { FolderOpen, Plus, Trash2, Loader2, ExternalLink, FileText, Image, Film, File, Upload, Link } from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'
import type { FileEntry } from './page'

type AddMode = 'upload' | 'link'
type LinkForm = { name: string; file_url: string; file_type: string; notes: string }
const EMPTY_LINK: LinkForm = { name: '', file_url: '', file_type: '', notes: '' }

function FileIcon({ type }: { type: string | null }) {
  if (!type) return <File className="w-4 h-4" />
  if (type.startsWith('image/')) return <Image className="w-4 h-4" />
  if (type.startsWith('video/')) return <Film className="w-4 h-4" />
  if (type === 'application/pdf' || type.includes('document')) return <FileText className="w-4 h-4" />
  return <File className="w-4 h-4" />
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FilesClient({ initialFiles }: { initialFiles: FileEntry[] | null }) {
  const [files,     setFiles]     = useState<FileEntry[]>(initialFiles ?? [])
  const [loading,   setLoading]   = useState(initialFiles === null)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [addMode,   setAddMode]   = useState<AddMode>('upload')
  const [link,      setLink]      = useState<LinkForm>(EMPTY_LINK)
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [uploadNotes, setUploadNotes] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameRef      = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialFiles === null) loadFiles()
  }, [initialFiles]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFiles() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/files')
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load')
      setFiles(data as FileEntry[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load files')
    } finally { setLoading(false) }
  }

  function linkField<K extends keyof LinkForm>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setLink(prev => ({ ...prev, [key]: e.target.value }))
      if (formError) setFormError(null)
    }
  }

  function closeForm() {
    setShowForm(false); setLink(EMPTY_LINK); setPickedFile(null)
    setUploadNotes(''); setFormError(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!pickedFile) { setFormError('Please select a file'); return }
    setSaving(true); setFormError(null)
    try {
      const fd = new FormData()
      fd.append('file', pickedFile)
      if (uploadNotes.trim()) fd.append('notes', uploadNotes.trim())
      const res  = await fetch('/api/files/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Upload failed')
      setFiles(prev => [data as FileEntry, ...prev])
      closeForm()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Upload failed')
    } finally { setSaving(false) }
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault()
    if (!link.name.trim()) { setFormError('Name is required'); return }
    setSaving(true); setFormError(null)
    try {
      const res  = await fetch('/api/files', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:      link.name.trim(),
          file_url:  link.file_url.trim() || undefined,
          file_type: link.file_type.trim() || undefined,
          notes:     link.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to add')
      setFiles(prev => [data as FileEntry, ...prev])
      closeForm()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add link')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res  = await fetch(`/api/files/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      setFiles(prev => prev.filter(f => f.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete file')
    } finally { setDeleting(null) }
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={loadFiles} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {files.length} file{files.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => { setShowForm(v => !v); setTimeout(() => fileInputRef.current?.focus(), 50) }}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <Plus className="w-4 h-4" /> Add File
        </button>
      </div>

      {showForm && (
        <div className="forge-card p-4 space-y-3">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 rounded-[8px]" style={{ background: 'var(--surface-subtle)' }}>
            {(['upload', 'link'] as AddMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setAddMode(m); setFormError(null) }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-[6px] text-[12px] font-[500] rounded-[6px] transition-colors"
                style={addMode === m
                  ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }
                  : { color: 'var(--text-muted)' }}
              >
                {m === 'upload' ? <Upload className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                {m === 'upload' ? 'Upload File' : 'Add Link'}
              </button>
            ))}
          </div>

          {addMode === 'upload' ? (
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
                  File <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <div
                  className="relative flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed py-8 cursor-pointer transition-colors"
                  style={{ borderColor: pickedFile ? 'var(--color-primary)' : 'var(--card-border)', background: 'var(--surface-subtle)' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef} type="file" className="sr-only"
                    onChange={e => { setPickedFile(e.target.files?.[0] ?? null); if (formError) setFormError(null) }}
                  />
                  {pickedFile ? (
                    <>
                      <FileIcon type={pickedFile.type} />
                      <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{pickedFile.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{fmtSize(pickedFile.size)}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Click to choose a file — max 20 MB</p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Notes (optional)</label>
                <input value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} placeholder="Description or context" className="forge-input text-[13px]" />
              </div>
              {formError && <p className="text-[12px] text-red-500">{formError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit" disabled={saving || !pickedFile}
                  className="inline-flex items-center gap-1.5 px-4 py-[7px] text-[13px] font-[500] rounded-[8px] text-white disabled:opacity-50"
                  style={{ background: 'var(--color-primary, #f97316)' }}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {saving ? 'Uploading…' : 'Upload'}
                </button>
                <button type="button" onClick={closeForm} className="px-3 py-[7px] text-[13px] rounded-[8px]" style={{ color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddLink} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
                    File Name <span style={{ color: 'var(--color-primary)' }}>*</span>
                  </label>
                  <input ref={nameRef} value={link.name} onChange={linkField('name')} placeholder="Q4 Report.pdf" className="forge-input text-[13px]" />
                </div>
                <div>
                  <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Link / URL</label>
                  <input type="url" value={link.file_url} onChange={linkField('file_url')} placeholder="https://drive.google.com/…" className="forge-input text-[13px]" />
                </div>
                <div>
                  <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Type</label>
                  <select value={link.file_type} onChange={linkField('file_type')} className="forge-input text-[13px]">
                    <option value="">— Select type —</option>
                    <option value="application/pdf">PDF</option>
                    <option value="application/msword">Word Document</option>
                    <option value="application/vnd.ms-excel">Spreadsheet</option>
                    <option value="image/png">Image</option>
                    <option value="video/mp4">Video</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
                  <input value={link.notes} onChange={linkField('notes')} placeholder="Description or context" className="forge-input text-[13px]" />
                </div>
              </div>
              {formError && <p className="text-[12px] text-red-500">{formError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit" disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-[7px] text-[13px] font-[500] rounded-[8px] text-white disabled:opacity-50"
                  style={{ background: 'var(--color-primary, #f97316)' }}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Add Link
                </button>
                <button type="button" onClick={closeForm} className="px-3 py-[7px] text-[13px] rounded-[8px]" style={{ color: 'var(--text-muted)' }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {files.length === 0 && !showForm && (
        <EmptyState
          icon={<FolderOpen className="w-6 h-6" style={{ color: '#9ca3af' }} />}
          title="No files yet"
          description="Add file links to keep your team's documents organised."
        />
      )}

      {files.length > 0 && (
        <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                {['File', 'Type', 'Notes', 'Added', ''].map(h => (
                  <th key={h} className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <tr key={file.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td className="px-4 py-[11px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                        <FileIcon type={file.file_type} />
                      </div>
                      <div>
                        {file.file_url ? (
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[13px] font-[500] hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            {file.name}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-[11px] text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    <div>{file.file_type ? file.file_type.split('/')[1]?.toUpperCase() ?? file.file_type : '—'}</div>
                    {file.file_size ? <div className="text-[11px]">{fmtSize(file.file_size)}</div> : null}
                  </td>
                  <td className="px-4 py-[11px] text-[12px] max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {file.notes ?? '—'}
                  </td>
                  <td className="px-4 py-[11px] text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-[11px] text-right">
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deleting === file.id}
                      className="p-1.5 rounded-[6px] hover:bg-red-50 disabled:opacity-40"
                      style={{ color: '#e53e3e' }}
                    >
                      {deleting === file.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { StickyNote, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'
import type { Note } from './page'

type FormState = { title: string; content: string }
const EMPTY_FORM: FormState = { title: '', content: '' }

export function NotesClient({ initialNotes }: { initialNotes: Note[] | null }) {
  const [notes,     setNotes]     = useState<Note[]>(initialNotes ?? [])
  const [loading,   setLoading]   = useState(initialNotes === null)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set())
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialNotes === null) loadNotes()
  }, [initialNotes]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadNotes() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/notes')
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load')
      setNotes(data as Note[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notes')
    } finally { setLoading(false) }
  }

  function field<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (formError) setFormError(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setFormError('Title is required'); return }
    setSaving(true); setFormError(null)
    try {
      const res  = await fetch('/api/notes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: form.title.trim(), content: form.content.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to add')
      setNotes(prev => [data as Note, ...prev])
      setForm(EMPTY_FORM); setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add note')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res  = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete note')
    } finally { setDeleting(null) }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={loadNotes} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {notes.length} note{notes.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => { setShowForm(v => !v); setTimeout(() => titleRef.current?.focus(), 50) }}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="forge-card p-4 space-y-3">
          <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>New note</p>
          <div>
            <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
              Title <span style={{ color: 'var(--color-primary)' }}>*</span>
            </label>
            <input ref={titleRef} value={form.title} onChange={field('title')} placeholder="Note title" className="forge-input text-[13px]" />
          </div>
          <div>
            <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Content</label>
            <textarea
              value={form.content}
              onChange={field('content')}
              placeholder="Write your note here…"
              rows={5}
              className="forge-input text-[13px] resize-none"
            />
          </div>
          {formError && <p className="text-[12px] text-red-500">{formError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-[7px] text-[13px] font-[500] rounded-[8px] text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary, #f97316)' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save Note
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
              className="px-3 py-[7px] text-[13px] rounded-[8px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 && !showForm && (
        <EmptyState
          icon={<StickyNote className="w-6 h-6" style={{ color: '#9ca3af' }} />}
          title="No notes yet"
          description="Create your first note to capture ideas."
        />
      )}

      {notes.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map(note => {
            const isOpen = expanded.has(note.id)
            return (
              <div key={note.id} className="forge-card flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-[600] leading-snug" style={{ color: 'var(--text-primary)' }}>{note.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {note.content && (
                      <button onClick={() => toggleExpand(note.id)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(note.id)}
                      disabled={deleting === note.id}
                      className="p-1 rounded hover:bg-red-50 disabled:opacity-40"
                      style={{ color: '#e53e3e' }}
                    >
                      {deleting === note.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </div>
                {note.content && !isOpen && (
                  <p className="text-[12px] line-clamp-2" style={{ color: 'var(--text-muted)' }}>{note.content}</p>
                )}
                {note.content && isOpen && (
                  <p className="text-[12px] whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{note.content}</p>
                )}
                <p className="text-[11px] mt-auto pt-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--card-border)' }}>
                  {new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Plus, Trash2, Loader2,
  ArrowLeft, Edit2, Save, X, Clock, Search,
} from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'

export type WikiPage = {
  id:         string
  title:      string
  slug:       string
  content:    string
  created_at: string
  updated_at: string
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm,  '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,   '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,    '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
    .replace(/^---$/gm,        '<hr/>')
    .replace(/^\- (.+)$/gm,    '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|l|c|h])/gm, '')
    .trim()
    .replace(/^([\s\S])/, (m) => m.match(/^</) ? m : `<p>${m}`)
    .replace(/([\s\S][^>])$/, (m) => m.match(/>$/) ? m : `${m}</p>`)
}

type View = 'list' | 'editor' | 'viewer'

export function WikiClient({ initialPages }: { initialPages: WikiPage[] | null }) {
  const [pages,    setPages]    = useState<WikiPage[]>(initialPages ?? [])
  const [loading,  setLoading]  = useState(initialPages === null)
  const [error,    setError]    = useState<string | null>(null)
  const [view,     setView]     = useState<View>('list')
  const [selected, setSelected] = useState<WikiPage | null>(null)
  const [search,   setSearch]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Editor state
  const [editTitle,   setEditTitle]   = useState('')
  const [editContent, setEditContent] = useState('')
  const [editError,   setEditError]   = useState<string | null>(null)
  const [isNew,       setIsNew]       = useState(false)

  const loadPages = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/wiki')
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load')
      setPages(data as WikiPage[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wiki')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (initialPages === null) loadPages() }, [initialPages, loadPages])

  function openNew() {
    setIsNew(true)
    setEditTitle('')
    setEditContent('')
    setEditError(null)
    setSelected(null)
    setView('editor')
  }

  function openEdit(page: WikiPage) {
    setIsNew(false)
    setEditTitle(page.title)
    setEditContent(page.content)
    setEditError(null)
    setSelected(page)
    setView('editor')
  }

  function openView(page: WikiPage) {
    setSelected(page)
    setView('viewer')
  }

  async function handleSave() {
    if (!editTitle.trim()) { setEditError('Title is required'); return }
    setSaving(true); setEditError(null)
    try {
      const url    = isNew ? '/api/wiki' : `/api/wiki/${selected!.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: editTitle.trim(), content: editContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to save')
      const saved = data as WikiPage
      if (isNew) {
        setPages(prev => [saved, ...prev])
      } else {
        setPages(prev => prev.map(p => p.id === saved.id ? saved : p))
      }
      setSelected(saved)
      setView('viewer')
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res  = await fetch(`/api/wiki/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      setPages(prev => prev.filter(p => p.id !== id))
      if (selected?.id === id) { setSelected(null); setView('list') }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally { setDeleting(null) }
  }

  const filtered = pages.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.content.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <LoadingState />
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  if (view === 'editor') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setView(selected ? 'viewer' : 'list') }}
            className="flex items-center gap-1.5 text-[13px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>
            {isNew ? 'New Page' : 'Edit Page'}
          </h2>
        </div>

        <div className="forge-card p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
              Title <span style={{ color: 'var(--color-primary)' }}>*</span>
            </label>
            <input
              value={editTitle}
              onChange={e => { setEditTitle(e.target.value); setEditError(null) }}
              placeholder="Page title"
              className="forge-input text-[15px] font-[600]"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
              Content — Markdown supported (# headings, **bold**, *italic*, `code`, - lists)
            </label>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="Write your page content here…&#10;&#10;# Heading&#10;&#10;Regular paragraph text. **Bold** and *italic* work.&#10;&#10;- Bullet point one&#10;- Bullet point two"
              rows={20}
              className="forge-input text-[13px] font-mono resize-y"
              style={{ color: 'var(--text-primary)', lineHeight: '1.6' }}
            />
          </div>
          {editError && <p className="text-[12px] text-red-500">{editError}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-[7px] text-[13px] font-[500] rounded-[8px] text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary, #f97316)' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save Page'}
            </button>
            <button
              onClick={() => setView(selected ? 'viewer' : 'list')}
              className="px-3 py-[7px] text-[13px] rounded-[8px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Viewer ────────────────────────────────────────────────────────────────
  if (view === 'viewer' && selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-1.5 text-[13px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" /> All pages
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openEdit(selected)}
              className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] font-[500] rounded-[8px] border transition-all"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)', background: 'var(--card-bg)' }}
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={() => handleDelete(selected.id)}
              disabled={deleting === selected.id}
              className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[12px] font-[500] rounded-[8px] border transition-all disabled:opacity-40"
              style={{ borderColor: '#fecaca', color: '#e53e3e', background: '#fff0f0' }}
            >
              {deleting === selected.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Delete
            </button>
          </div>
        </div>

        <div className="forge-card p-6">
          <h1 className="text-[22px] font-[700] tracking-[-0.4px] mb-2" style={{ color: 'var(--text-primary)' }}>
            {selected.title}
          </h1>
          <p className="flex items-center gap-1 text-[11px] mb-6" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-3 h-3" />
            Last edited {relTime(selected.updated_at)}
          </p>

          {selected.content ? (
            <div
              className="prose-forge text-[14px] leading-[1.7]"
              style={{ color: 'var(--text-primary)' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(selected.content) }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Edit2 className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>This page has no content yet.</p>
              <button
                onClick={() => openEdit(selected)}
                className="text-[13px] font-[500]"
                style={{ color: 'var(--color-primary)' }}
              >
                Add content →
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={loadPages} />}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pages…"
            className="forge-input pl-8 text-[13px]"
          />
        </div>
        <button
          onClick={openNew}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <Plus className="w-4 h-4" /> New Page
        </button>
      </div>

      {filtered.length === 0 && !error && (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" style={{ color: '#9ca3af' }} />}
          title={search ? `No pages match "${search}"` : 'No pages yet'}
          description={search ? 'Try a different search term.' : 'Create your first wiki page to build a knowledge base.'}
          action={!search && (
            <button onClick={() => setView('editor')} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Create First Page
            </button>
          )}
        />
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(page => (
            <div
              key={page.id}
              className="forge-card p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-sm"
              onClick={() => openView(page)}
            >
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#f0fdf4' }}>
                <BookOpen className="w-[18px] h-[18px]" style={{ color: '#16a34a' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-[600] truncate" style={{ color: 'var(--text-primary)' }}>
                  {page.title}
                </p>
                <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {page.content
                    ? page.content.replace(/[#*`-]/g, '').slice(0, 100) + (page.content.length > 100 ? '…' : '')
                    : 'No content yet'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="w-3 h-3" />
                  {relTime(page.updated_at)}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); openEdit(page) }}
                  className="p-1.5 rounded-[6px] transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(page.id) }}
                  disabled={deleting === page.id}
                  className="p-1.5 rounded-[6px] hover:bg-red-50 disabled:opacity-40"
                  style={{ color: '#e53e3e' }}
                  title="Delete"
                >
                  {deleting === page.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

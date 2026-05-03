'use client'

/**
 * WORKSPACE MODULE CLIENT TEMPLATE
 * Copy to <Module>Client.tsx and replace Thing/things with your entity name.
 *
 * Pattern enforced here:
 *  - initialData null → fetch from API on mount (handles server-side DB error)
 *  - loading / error / empty states via shared StatusStates components
 *  - if (saving) return guard on every mutating action (prevents double-submit)
 *  - All API errors surfaced via formError (local) or error (page-level)
 *  - No raw API error messages shown to user — only sanitized strings
 */

import { useState, useEffect, useRef } from 'react'
import { Package, Plus, Trash2, Loader2 } from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'
import { fetchApi } from '@/hooks/useSafeData'
import type { Thing } from './page'

type FormState = { name: string; notes: string }
const EMPTY_FORM: FormState = { name: '', notes: '' }

export function ThingClient({ initialThings }: { initialThings: Thing[] | null }) {
  const [items,     setItems]     = useState<Thing[]>(initialThings ?? [])
  const [loading,   setLoading]   = useState(initialThings === null)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  // If the server page couldn't load data, fetch client-side
  useEffect(() => {
    if (initialThings === null) load()
  }, [initialThings]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true); setError(null)
    try {
      const data = await fetchApi<Thing[]>('/api/things')
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load items')
    } finally { setLoading(false) }
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (formError) setFormError(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return                          // prevent double-submit
    if (!form.name.trim()) { setFormError('Name is required'); return }
    setSaving(true); setFormError(null)
    try {
      const item = await fetchApi<Thing>('/api/things', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:  form.name.trim(),
          notes: form.notes.trim() || undefined,
        }),
      })
      setItems(prev => [item, ...prev])
      setForm(EMPTY_FORM); setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create item')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (deleting) return                        // prevent concurrent deletes
    setDeleting(id)
    try {
      await fetchApi(`/api/things/${id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete item')
    } finally { setDeleting(null) }
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={load} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => { setShowForm(v => !v); setTimeout(() => nameRef.current?.focus(), 50) }}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" /> New Thing
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="forge-card p-4 space-y-3">
          <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>New thing</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
                Name <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input ref={nameRef} value={form.name} onChange={field('name')} placeholder="Name" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
              <input value={form.notes} onChange={field('notes')} placeholder="Optional notes" className="forge-input text-[13px]" />
            </div>
          </div>
          {formError && <p className="text-[12px] text-red-500">{formError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit" disabled={saving}
              className="btn btn-primary disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
              className="text-[13px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <EmptyState
          icon={<Package className="w-6 h-6" style={{ color: '#9ca3af' }} />}
          title="No things yet"
          description="Create your first item to get started."
        />
      )}

      {items.length > 0 && (
        <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                  {['Name', 'Notes', 'Added', ''].map(h => (
                    <th key={h} className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f5f7' }}>
                    <td className="px-4 py-[11px] text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{t.name}</td>
                    <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>{t.notes ?? '—'}</td>
                    <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-[11px] text-right">
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        className="p-1.5 rounded-[6px] hover:bg-red-50 disabled:opacity-40 transition-colors"
                        style={{ color: '#e53e3e' }}
                      >
                        {deleting === t.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Kanban, Plus, Trash2, Loader2, DollarSign, GripVertical } from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'
import type { Deal } from './page'

const STAGES = [
  { id: 'new',       label: 'New Lead',       color: '#6b7280', bg: '#f3f4f6' },
  { id: 'contacted', label: 'Contacted',      color: '#1d4ed8', bg: '#dbeafe' },
  { id: 'proposal',  label: 'Proposal Sent',  color: '#d97706', bg: '#fef3c7' },
  { id: 'negotiation', label: 'Negotiating',  color: '#7c3aed', bg: '#ede9fe' },
  { id: 'won',       label: 'Won',            color: '#16a34a', bg: '#dcfce7' },
  { id: 'lost',      label: 'Lost',           color: '#dc2626', bg: '#fee2e2' },
]

type FormState = { name: string; contact_name: string; company: string; stage: string; value: string; notes: string }
const EMPTY_FORM: FormState = { name: '', contact_name: '', company: '', stage: 'new', value: '', notes: '' }

function fmt(cents: number): string {
  if (cents === 0) return '—'
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function PipelinesClient({ initialDeals }: { initialDeals: Deal[] | null }) {
  const [deals,     setDeals]     = useState<Deal[]>(initialDeals ?? [])
  const [loading,   setLoading]   = useState(initialDeals === null)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [moving,    setMoving]    = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialDeals === null) loadDeals()
  }, [initialDeals]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDeals() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/pipeline-deals')
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load')
      setDeals(data as Deal[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load deals')
    } finally { setLoading(false) }
  }

  function field<K extends keyof FormState>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (formError) setFormError(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Deal name is required'); return }
    const value = form.value.trim() ? Math.round(parseFloat(form.value) * 100) : 0
    if (form.value.trim() && isNaN(value)) { setFormError('Value must be a number'); return }
    setSaving(true); setFormError(null)
    try {
      const res  = await fetch('/api/pipeline-deals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:         form.name.trim(),
          contact_name: form.contact_name.trim() || undefined,
          company:      form.company.trim() || undefined,
          stage:        form.stage,
          value_cents:  value,
          notes:        form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to add')
      setDeals(prev => [data as Deal, ...prev])
      setForm(EMPTY_FORM); setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add deal')
    } finally { setSaving(false) }
  }

  async function handleMoveStage(deal: Deal, newStage: string) {
    setMoving(deal.id)
    try {
      const res  = await fetch(`/api/pipeline-deals/${deal.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ stage: newStage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to move')
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: newStage } : d))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update deal')
    } finally { setMoving(null) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res  = await fetch(`/api/pipeline-deals/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      setDeals(prev => prev.filter(d => d.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete deal')
    } finally { setDeleting(null) }
  }

  if (loading) {
    return <LoadingState />
  }

  const totalValue = deals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value_cents, 0)
  const openValue  = deals.filter(d => !['won','lost'].includes(d.stage)).reduce((s, d) => s + d.value_cents, 0)

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={loadDeals} />}

      {/* Summary bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            <DollarSign className="w-3.5 h-3.5" />
            <span>Open pipeline: <strong style={{ color: 'var(--text-primary)' }}>{fmt(openValue)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            <span>Won: <strong style={{ color: '#16a34a' }}>{fmt(totalValue)}</strong></span>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setTimeout(() => nameRef.current?.focus(), 50) }}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <Plus className="w-4 h-4" /> Add Deal
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="forge-card p-4 space-y-3">
          <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>New deal</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
                Deal Name <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input ref={nameRef} value={form.name} onChange={field('name')} placeholder="Acme Corp - Annual Plan" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Contact</label>
              <input value={form.contact_name} onChange={field('contact_name')} placeholder="Jane Smith" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Company</label>
              <input value={form.company} onChange={field('company')} placeholder="Acme Corp" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Stage</label>
              <select value={form.stage} onChange={field('stage')} className="forge-input text-[13px]">
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Value ($)</label>
              <input type="number" min={0} step={0.01} value={form.value} onChange={field('value')} placeholder="5000" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
              <input value={form.notes} onChange={field('notes')} placeholder="Optional notes" className="forge-input text-[13px]" />
            </div>
          </div>
          {formError && <p className="text-[12px] text-red-500">{formError}</p>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-[7px] text-[13px] font-[500] rounded-[8px] text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary, #f97316)' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Deal
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
              className="px-3 py-[7px] text-[13px] rounded-[8px]" style={{ color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {deals.length === 0 && !showForm && (
        <EmptyState
          icon={<Kanban className="w-6 h-6" style={{ color: '#9ca3af' }} />}
          title="No deals yet"
          description="Add your first deal to start tracking your pipeline."
        />
      )}

      {/* Kanban board */}
      {deals.length > 0 && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {STAGES.map(stage => {
            const col = deals.filter(d => d.stage === stage.id)
            return (
              <div key={stage.id} className="flex flex-col gap-2">
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2 rounded-[10px]" style={{ background: stage.bg }}>
                  <span className="text-[11px] font-[700] uppercase tracking-[0.06em]" style={{ color: stage.color }}>{stage.label}</span>
                  <span className="text-[11px] font-[600]" style={{ color: stage.color }}>{col.length}</span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 min-h-[40px]">
                  {col.map(deal => (
                    <div key={deal.id} className="forge-card p-3 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-[13px] font-[600] leading-snug" style={{ color: 'var(--text-primary)' }}>{deal.name}</p>
                        <button
                          onClick={() => handleDelete(deal.id)}
                          disabled={deleting === deal.id}
                          className="p-0.5 shrink-0 hover:text-red-500 disabled:opacity-40"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {deleting === deal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                      {deal.contact_name && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{deal.contact_name}{deal.company ? ` · ${deal.company}` : ''}</p>}
                      {deal.value_cents > 0 && (
                        <p className="text-[12px] font-[600]" style={{ color: '#16a34a' }}>{fmt(deal.value_cents)}</p>
                      )}
                      {/* Move to stage */}
                      <select
                        value={deal.stage}
                        disabled={moving === deal.id}
                        onChange={e => handleMoveStage(deal, e.target.value)}
                        className="mt-1 text-[11px] rounded-[6px] border px-1.5 py-1 outline-none w-full"
                        style={{ borderColor: 'var(--card-border)', background: 'var(--surface-subtle)', color: 'var(--text-muted)' }}
                      >
                        {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

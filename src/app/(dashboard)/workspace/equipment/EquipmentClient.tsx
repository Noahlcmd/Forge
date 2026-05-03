'use client'

import { useState, useEffect, useRef } from 'react'
import { Wrench, Plus, Trash2, Loader2 } from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'
import type { EquipmentItem } from './page'

type FormState = { name: string; status: EquipmentItem['status']; serial_number: string; location: string; notes: string }
const EMPTY_FORM: FormState = { name: '', status: 'active', serial_number: '', location: '', notes: '' }

const STATUS_COLOR: Record<EquipmentItem['status'], { bg: string; text: string; label: string }> = {
  active:      { bg: '#dcfce7', text: '#16a34a', label: 'Active' },
  maintenance: { bg: '#fef9c3', text: '#ca8a04', label: 'Maintenance' },
  retired:     { bg: '#f3f4f6', text: '#6b7280', label: 'Retired' },
}

export function EquipmentClient({ initialItems }: { initialItems: EquipmentItem[] | null }) {
  const [items,     setItems]     = useState<EquipmentItem[]>(initialItems ?? [])
  const [loading,   setLoading]   = useState(initialItems === null)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialItems === null) loadItems()
  }, [initialItems]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadItems() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/equipment')
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load')
      setItems(data as EquipmentItem[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load equipment')
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
    if (!form.name.trim()) { setFormError('Name is required'); return }
    setSaving(true); setFormError(null)
    try {
      const res  = await fetch('/api/equipment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:          form.name.trim(),
          status:        form.status,
          serial_number: form.serial_number.trim() || undefined,
          location:      form.location.trim() || undefined,
          notes:         form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to add')
      setItems(prev => [...prev, data as EquipmentItem].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(EMPTY_FORM); setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add equipment')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res  = await fetch(`/api/equipment/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete equipment')
    } finally { setDeleting(null) }
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={loadItems} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => { setShowForm(v => !v); setTimeout(() => nameRef.current?.focus(), 50) }}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <Plus className="w-4 h-4" /> Add Equipment
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="forge-card p-4 space-y-3">
          <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>New equipment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
                Name <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input ref={nameRef} value={form.name} onChange={field('name')} placeholder="Equipment name" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
              <select value={form.status} onChange={field('status')} className="forge-input text-[13px]">
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Serial Number</label>
              <input value={form.serial_number} onChange={field('serial_number')} placeholder="SN-001234" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Location</label>
              <input value={form.location} onChange={field('location')} placeholder="Office, Warehouse…" className="forge-input text-[13px]" />
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
              Add Equipment
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

      {items.length === 0 && !showForm && (
        <EmptyState
          icon={<Wrench className="w-6 h-6" style={{ color: '#9ca3af' }} />}
          title="No equipment yet"
          description="Add your first item to start tracking equipment."
        />
      )}

      {items.length > 0 && (
        <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                {['Equipment', 'Status', 'Serial Number', 'Location', ''].map(h => (
                  <th key={h} className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const sc = STATUS_COLOR[item.status]
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f5f7' }}>
                    <td className="px-4 py-[11px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: '#ffedd5' }}>
                          <Wrench className="w-3.5 h-3.5" style={{ color: '#ea580c' }} />
                        </div>
                        <div>
                          <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                          {item.notes && <p className="text-[11px] truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{item.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-[11px]">
                      <span className="text-[11px] font-[600] px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      {item.serial_number ?? '—'}
                    </td>
                    <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      {item.location ?? '—'}
                    </td>
                    <td className="px-4 py-[11px] text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="p-1.5 rounded-[6px] hover:bg-red-50 disabled:opacity-40"
                        style={{ color: '#e53e3e' }}
                      >
                        {deleting === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

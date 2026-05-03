'use client'

import { useState, useEffect, useRef } from 'react'
import { Boxes, Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'

type Item = {
  id:         string
  name:       string
  quantity:   number
  unit:       string | null
  notes:      string | null
  created_at: string
  updated_at: string
}

type FormState = { name: string; quantity: string; unit: string; notes: string }
const EMPTY_FORM: FormState = { name: '', quantity: '0', unit: '', notes: '' }

export function InventoryClient({ initialItems }: { initialItems: Item[] | null }) {
  const [items,     setItems]     = useState<Item[]>(initialItems ?? [])
  const [loading,   setLoading]   = useState(initialItems === null)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [editQty,   setEditQty]   = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialItems === null) loadItems()
  }, [initialItems]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadItems() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/inventory')
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load')
      setItems(data as Item[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (formError) setFormError(null)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Name is required'); return }
    const qty = parseInt(form.quantity, 10)
    if (isNaN(qty) || qty < 0) { setFormError('Quantity must be 0 or more'); return }
    setSaving(true)
    setFormError(null)
    try {
      const res  = await fetch('/api/inventory', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     form.name.trim(),
          quantity: qty,
          unit:     form.unit.trim() || undefined,
          notes:    form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to add')
      setItems(prev => [...prev, data as Item].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res  = await fetch(`/api/inventory/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete item')
    } finally {
      setDeleting(null)
    }
  }

  async function handleUpdateQty(id: string) {
    const qty = parseInt(editQty, 10)
    if (isNaN(qty) || qty < 0) { setEditId(null); return }
    try {
      const res  = await fetch(`/api/inventory/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ quantity: qty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to update')
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update quantity')
    } finally {
      setEditId(null)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={loadItems} />}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => { setShowForm(v => !v); setTimeout(() => nameRef.current?.focus(), 50) }}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="forge-card p-4 space-y-3"
        >
          <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>New inventory item</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
                Name <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input
                ref={nameRef}
                value={form.name}
                onChange={field('name')}
                placeholder="Product or material name"
                className="forge-input text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Quantity</label>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={field('quantity')}
                className="forge-input text-[13px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Unit (optional)</label>
              <input
                value={form.unit}
                onChange={field('unit')}
                placeholder="pcs, kg, boxes…"
                className="forge-input text-[13px]"
              />
            </div>
          </div>

          {formError && (
            <p className="text-[12px] text-red-500">{formError}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-[7px] text-[13px] font-[500] rounded-[8px] text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary, #f97316)' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Item
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(null) }}
              className="px-3 py-[7px] text-[13px] rounded-[8px] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <EmptyState
          icon={<Boxes className="w-6 h-6" style={{ color: '#9ca3af' }} />}
          title="No inventory items yet"
          description="Add your first item to start tracking stock."
        />
      )}

      {/* Table */}
      {items.length > 0 && (
        <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                {['Item', 'Quantity', 'Unit', 'Last Updated', ''].map(h => (
                  <th
                    key={h}
                    className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f5f7' }}>
                  <td className="px-4 py-[11px]">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                        style={{ background: '#fef3c7' }}
                      >
                        <Boxes className="w-3.5 h-3.5" style={{ color: '#d97706' }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                        {item.notes && (
                          <p className="text-[11px] truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{item.notes}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Inline quantity edit */}
                  <td className="px-4 py-[11px]">
                    {editId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateQty(item.id)
                            if (e.key === 'Escape') setEditId(null)
                          }}
                          className="forge-input text-[13px] w-20"
                          autoFocus
                        />
                        <button onClick={() => handleUpdateQty(item.id)} className="p-1 text-green-600"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditId(null)} className="p-1" style={{ color: 'var(--text-muted)' }}><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditId(item.id); setEditQty(String(item.quantity)) }}
                        className="flex items-center gap-1.5 group"
                      >
                        <span
                          className="text-[14px] font-[600]"
                          style={{ color: item.quantity === 0 ? '#e53e3e' : 'var(--text-primary)' }}
                        >
                          {item.quantity}
                        </span>
                        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                      </button>
                    )}
                  </td>

                  <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {item.unit ?? '—'}
                  </td>

                  <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>

                  <td className="px-4 py-[11px] text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="p-1.5 rounded-[6px] transition-colors hover:bg-red-50 disabled:opacity-40"
                      style={{ color: '#e53e3e' }}
                      title="Delete item"
                    >
                      {deleting === item.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
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

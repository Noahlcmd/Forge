'use client'

import { useState, useEffect, useRef } from 'react'
import { Truck, Plus, Trash2, Loader2, Mail, Phone } from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'
import type { Supplier } from './page'

type FormState = { name: string; contact_name: string; email: string; phone: string; notes: string }
const EMPTY_FORM: FormState = { name: '', contact_name: '', email: '', phone: '', notes: '' }

export function SuppliersClient({ initialSuppliers }: { initialSuppliers: Supplier[] | null }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers ?? [])
  const [loading,   setLoading]   = useState(initialSuppliers === null)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialSuppliers === null) loadSuppliers()
  }, [initialSuppliers]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSuppliers() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/suppliers')
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load')
      setSuppliers(data as Supplier[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load suppliers')
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
    if (!form.name.trim()) { setFormError('Name is required'); return }
    setSaving(true); setFormError(null)
    try {
      const res  = await fetch('/api/suppliers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:         form.name.trim(),
          contact_name: form.contact_name.trim() || undefined,
          email:        form.email.trim() || undefined,
          phone:        form.phone.trim() || undefined,
          notes:        form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to add')
      setSuppliers(prev => [...prev, data as Supplier].sort((a, b) => a.name.localeCompare(b.name)))
      setForm(EMPTY_FORM); setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add supplier')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res  = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      setSuppliers(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete supplier')
    } finally { setDeleting(null) }
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={loadSuppliers} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {suppliers.length} supplier{suppliers.length === 1 ? '' : 's'}
        </p>
        <button
          onClick={() => { setShowForm(v => !v); setTimeout(() => nameRef.current?.focus(), 50) }}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="forge-card p-4 space-y-3">
          <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>New supplier</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
                Company Name <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input ref={nameRef} value={form.name} onChange={field('name')} placeholder="Acme Corp" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Contact Name</label>
              <input value={form.contact_name} onChange={field('contact_name')} placeholder="Jane Smith" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
              <input type="email" value={form.email} onChange={field('email')} placeholder="contact@supplier.com" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Phone</label>
              <input value={form.phone} onChange={field('phone')} placeholder="+1 555 000 0000" className="forge-input text-[13px]" />
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
              Add Supplier
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

      {suppliers.length === 0 && !showForm && (
        <EmptyState
          icon={<Truck className="w-6 h-6" style={{ color: '#9ca3af' }} />}
          title="No suppliers yet"
          description="Add your first supplier to build your database."
        />
      )}

      {suppliers.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {suppliers.map(s => (
            <div key={s.id} className="forge-card flex items-start gap-3 p-4">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#ffe4e6' }}>
                <Truck className="w-4 h-4" style={{ color: '#e11d48' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                {s.contact_name && (
                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{s.contact_name}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {s.email && (
                    <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-[12px] hover:underline" style={{ color: 'var(--text-muted)' }}>
                      <Mail className="w-3 h-3" /> {s.email}
                    </a>
                  )}
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-[12px] hover:underline" style={{ color: 'var(--text-muted)' }}>
                      <Phone className="w-3 h-3" /> {s.phone}
                    </a>
                  )}
                </div>
                {s.notes && <p className="text-[12px] mt-1.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{s.notes}</p>}
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={deleting === s.id}
                className="p-1.5 rounded-[6px] hover:bg-red-50 disabled:opacity-40 shrink-0"
                style={{ color: '#e53e3e' }}
              >
                {deleting === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

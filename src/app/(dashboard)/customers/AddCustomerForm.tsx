'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function AddCustomerForm() {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm]       = useState({ name: '', email: '', phone: '' })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return          // guard against rapid re-submit
    if (!form.name.trim()) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/customers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:  form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Failed to save — please try again')
        return
      }

      setForm({ name: '', email: '', phone: '' })
      setOpen(false)
      toast.success('Customer added')
      router.refresh()
    } catch {
      setError('Network error — please check your connection and try again')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn btn-primary"
      >
        <Plus className="w-4 h-4" />
        New Customer
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="forge-card p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>New Customer</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Name <span style={{ color: 'var(--color-primary)' }}>*</span>
          </label>
          <input
            required
            value={form.name}
            onChange={set('name')}
            placeholder="Jane Smith"
            className="forge-input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="jane@example.com"
            className="forge-input"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+1 555 000 0000"
            className="forge-input"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary disabled:opacity-50"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Customer
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

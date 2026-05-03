'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

type FormState = {
  company:      string
  contact_name: string
  email:        string
  phone:        string
  industry:     string
  location:     string
}

const EMPTY: FormState = {
  company:      '',
  contact_name: '',
  email:        '',
  phone:        '',
  industry:     '',
  location:     '',
}

export function AddLeadForm() {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState<FormState>(EMPTY)
  const [errors,  setErrors]  = useState<Partial<FormState>>({})
  const [apiError, setApiError] = useState<string | null>(null)

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  function validate(): boolean {
    const next: Partial<FormState> = {}
    if (!form.company.trim()) next.company = 'Company name is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return              // guard double-submit
    setApiError(null)
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company:      form.company.trim(),
          contact_name: form.contact_name.trim() || undefined,
          email:        form.email.trim()        || undefined,
          phone:        form.phone.trim()        || undefined,
          industry:     form.industry.trim()     || undefined,
          location:     form.location.trim()     || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setApiError((data as { error?: string }).error ?? 'Failed to save — please try again')
        return
      }
      setForm(EMPTY)
      setErrors({})
      setOpen(false)
      toast.success('Lead added')
      router.refresh()
    } catch {
      setApiError('Network error — please check your connection and try again')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setForm(EMPTY)
    setErrors({})
    setApiError(null)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn btn-primary"
      >
        <Plus className="w-4 h-4" />
        Add Lead
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="forge-card p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>New Lead</h3>
        <button type="button" onClick={handleClose} className="transition-colors" style={{ color: 'var(--text-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Company <span style={{ color: 'var(--color-primary)' }}>*</span>
          </label>
          <input
            value={form.company}
            onChange={field('company')}
            placeholder="Acme Corp"
            className={`forge-input ${errors.company ? 'border-red-400' : ''}`}
          />
          {errors.company && (
            <p className="text-xs text-red-500">{errors.company}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Contact name</label>
          <input
            value={form.contact_name}
            onChange={field('contact_name')}
            placeholder="Jane Smith"
            className="forge-input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={field('email')}
            placeholder="jane@acme.com"
            className="forge-input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={field('phone')}
            placeholder="+1 555 000 0000"
            className="forge-input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Industry</label>
          <input
            value={form.industry}
            onChange={field('industry')}
            placeholder="SaaS / Software"
            className="forge-input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Location</label>
          <input
            value={form.location}
            onChange={field('location')}
            placeholder="San Francisco, CA"
            className="forge-input"
          />
        </div>

      </div>

      {apiError && (
        <p className="text-xs text-red-500">{apiError}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary disabled:opacity-50"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Lead
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

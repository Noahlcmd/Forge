'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

type FormState = {
  name:       string
  from_name:  string
  from_email: string
}

const EMPTY: FormState = { name: '', from_name: '', from_email: '' }

export function AddSequenceForm() {
  const router   = useRouter()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [form,    setForm]    = useState<FormState>(EMPTY)
  const [error,   setError]   = useState<string | null>(null)
  const [nameErr, setNameErr] = useState<string | null>(null)

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }))
      if (key === 'name') setNameErr(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    if (!form.name.trim()) { setNameErr('Sequence name is required'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/outreach', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       form.name.trim(),
          from_name:  form.from_name.trim() || undefined,
          from_email: form.from_email.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to create sequence — please try again')
        return
      }
      setForm(EMPTY)
      setOpen(false)
      toast.success('Sequence created')
      router.refresh()
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-[10px] text-[13px] font-[500] text-white transition-colors"
        style={{ background: 'var(--color-primary, #f97316)' }}
      >
        <Plus className="w-4 h-4" />
        New Sequence
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="forge-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>New Sequence</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setForm(EMPTY); setError(null) }}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
            Sequence name <span style={{ color: 'var(--color-primary)' }}>*</span>
          </label>
          <input
            value={form.name}
            onChange={field('name')}
            placeholder="Cold outreach Q1"
            className={`forge-input text-[13px] ${nameErr ? 'border-red-400' : ''}`}
          />
          {nameErr && <p className="text-[12px] text-red-500 mt-1">{nameErr}</p>}
        </div>
        <div>
          <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>From name</label>
          <input
            value={form.from_name}
            onChange={field('from_name')}
            placeholder="Jane Smith"
            className="forge-input text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>From email</label>
          <input
            type="email"
            value={form.from_email}
            onChange={field('from_email')}
            placeholder="jane@company.com"
            className="forge-input text-[13px]"
          />
        </div>
      </div>

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-[10px] text-[13px] font-[500] text-white disabled:opacity-50 transition-colors"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Create Sequence
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setForm(EMPTY); setError(null) }}
          className="text-[13px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Calendar, Trash2 } from 'lucide-react'

type CalendarRow = {
  id:         string
  name:       string
  color:      string
  is_default: boolean
  created_at: string
}

const PRESET_COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899']

interface Props { initialCalendars: CalendarRow[] }

export function CalendarClient({ initialCalendars }: Props) {
  const router = useRouter()
  const [calendars, setCalendars] = useState<CalendarRow[]>(initialCalendars)
  const [open,        setOpen]        = useState(false)
  const [name,        setName]        = useState('')
  const [color,       setColor]       = useState('#f97316')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [deleting,    setDeleting]    = useState<Set<string>>(new Set())
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || loading) return   // guard double-submit
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/calendars', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), color }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to create')
      setCalendars(prev => [...prev, data as CalendarRow])
      setName('')
      setColor('#f97316')
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
            Calendar
          </h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            {calendars.length > 0
              ? `${calendars.length} calendar${calendars.length === 1 ? '' : 's'}`
              : 'Manage your calendars and events'}
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            New Calendar
          </button>
        )}
      </div>

      {/* Create form */}
      {open && (
        <form
          onSubmit={handleCreate}
          className="forge-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>New Calendar</h3>
            <button type="button" onClick={() => { setOpen(false); setError(null) }} style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Name <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Client Meetings"
                className="forge-input"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? 'white' : 'transparent',
                      transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={!name.trim() || loading} className="btn btn-primary disabled:opacity-50">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Calendar
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(null) }}
              className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Delete error */}
      {deleteError && (
        <div className="forge-card flex items-center justify-between gap-3 p-3" style={{ borderColor: '#fecaca' }}>
          <p className="text-[13px] text-red-600">{deleteError}</p>
          <button
            onClick={() => setDeleteError(null)}
            className="shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Calendar list */}
      {calendars.length === 0 ? (
        <div className="forge-card flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f3f4f6' }}>
            <Calendar className="w-6 h-6" style={{ color: '#9ca3af' }} />
          </div>
          <div>
            <p className="text-[14px] font-[500]" style={{ color: 'var(--text-primary)' }}>No calendars yet</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Create a calendar to schedule client meetings and events.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create first calendar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {calendars.map(cal => (
            <div
              key={cal.id}
              className="forge-card p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cal.color + '20' }}
                  >
                    <Calendar className="w-5 h-5" style={{ color: cal.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-[600] truncate" style={{ color: 'var(--text-primary)' }}>{cal.name}</p>
                    {cal.is_default && (
                      <span className="text-[10px] font-[500]" style={{ color: 'var(--text-muted)' }}>Default</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setDeleting(prev => new Set(prev).add(cal.id))
                    setDeleteError(null)
                    try {
                      const res = await fetch(`/api/calendars/${cal.id}`, { method: 'DELETE' })
                      if (res.ok || res.status === 404) {
                        setCalendars(prev => prev.filter(c => c.id !== cal.id))
                      } else {
                        const data = await res.json().catch(() => ({}))
                        setDeleteError((data as { error?: string }).error ?? 'Failed to delete calendar')
                      }
                    } catch {
                      setDeleteError('Network error — could not delete calendar')
                    } finally {
                      setDeleting(prev => { const next = new Set(prev); next.delete(cal.id); return next })
                    }
                  }}
                  disabled={deleting.has(cal.id)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-50 shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  title="Remove calendar"
                >
                  {deleting.has(cal.id)
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5 hover:text-red-500" />
                  }
                </button>
              </div>
              <div className="h-1 w-full rounded-full" style={{ background: cal.color }} />
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Created {new Date(cal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

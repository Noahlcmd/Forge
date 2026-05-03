'use client'

import { useState, useEffect, useRef } from 'react'
import { Briefcase, Plus, Trash2, Loader2, Calendar } from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'
import type { Project } from './page'

type FormState = {
  name:        string
  status:      Project['status']
  client_name: string
  due_date:    string
  budget:      string
  notes:       string
}
const EMPTY_FORM: FormState = { name: '', status: 'active', client_name: '', due_date: '', budget: '', notes: '' }

const STATUS_COLOR: Record<Project['status'], { bg: string; text: string; label: string }> = {
  active:    { bg: '#dbeafe', text: '#1d4ed8', label: 'Active' },
  completed: { bg: '#dcfce7', text: '#16a34a', label: 'Completed' },
  on_hold:   { bg: '#fef9c3', text: '#ca8a04', label: 'On Hold' },
  cancelled: { bg: '#f3f4f6', text: '#6b7280', label: 'Cancelled' },
}

function fmtBudget(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export function ProjectsClient({ initialProjects, currency }: { initialProjects: Project[] | null; currency: string }) {
  const [projects,       setProjects]       = useState<Project[]>(initialProjects ?? [])
  const [loading,        setLoading]        = useState(initialProjects === null)
  const [error,          setError]          = useState<string | null>(null)
  const [showForm,       setShowForm]       = useState(false)
  const [form,           setForm]           = useState<FormState>(EMPTY_FORM)
  const [saving,         setSaving]         = useState(false)
  const [formError,      setFormError]      = useState<string | null>(null)
  const [deleting,       setDeleting]       = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialProjects === null) loadProjects()
  }, [initialProjects]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProjects() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/projects')
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load')
      setProjects(data as Project[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects')
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
    const budget = form.budget.trim() ? parseInt(form.budget.trim(), 10) : undefined
    if (form.budget.trim() && (isNaN(budget!) || budget! < 0)) { setFormError('Budget must be a non-negative number'); return }
    setSaving(true); setFormError(null)
    try {
      const res  = await fetch('/api/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        form.name.trim(),
          status:      form.status,
          client_name: form.client_name.trim() || undefined,
          due_date:    form.due_date || undefined,
          budget,
          notes:       form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to add')
      setProjects(prev => [data as Project, ...prev])
      setForm(EMPTY_FORM); setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add project')
    } finally { setSaving(false) }
  }

  async function handleStatusChange(id: string, status: Project['status']) {
    setUpdatingStatus(id)
    try {
      const res  = await fetch(`/api/projects/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to update')
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
    } finally { setUpdatingStatus(null) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res  = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project')
    } finally { setDeleting(null) }
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={loadProjects} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {projects.filter(p => p.status === 'active').length} active · {projects.length} total
        </p>
        <button
          onClick={() => { setShowForm(v => !v); setTimeout(() => nameRef.current?.focus(), 50) }}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="forge-card p-4 space-y-3">
          <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>New project</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
                Project Name <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input ref={nameRef} value={form.name} onChange={field('name')} placeholder="Website Redesign" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
              <select value={form.status} onChange={field('status')} className="forge-input text-[13px]">
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Client</label>
              <input value={form.client_name} onChange={field('client_name')} placeholder="Client name" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Due Date</label>
              <input type="date" value={form.due_date} onChange={field('due_date')} className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Budget ({currency})</label>
              <input type="number" min={0} value={form.budget} onChange={field('budget')} placeholder="5000" className="forge-input text-[13px]" />
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
              className="inline-flex items-center gap-1.5 px-4 py-[7px] text-[13px] font-[500] rounded-[8px] text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary, #f97316)' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create Project
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

      {projects.length === 0 && !showForm && (
        <EmptyState
          icon={<Briefcase className="w-6 h-6" style={{ color: '#1d4ed8' }} />}
          title="No projects yet"
          description="Create your first project to start tracking work."
        />
      )}

      {projects.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map(p => {
            const sc         = STATUS_COLOR[p.status]
            const isUpdating = updatingStatus === p.id
            return (
              <div key={p.id} className="forge-card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: '#dbeafe' }}>
                      <Briefcase className="w-4 h-4" style={{ color: '#1d4ed8' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-[600] truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      {p.client_name && <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{p.client_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <select
                        value={p.status}
                        onChange={e => handleStatusChange(p.id, e.target.value as Project['status'])}
                        className="text-[11px] font-[600] px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer appearance-none"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="on_hold">On Hold</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}
                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                      className="p-1.5 rounded-[6px] hover:bg-red-50 disabled:opacity-40"
                      style={{ color: '#e53e3e' }}
                    >
                      {deleting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {(p.due_date || p.budget != null) && (
                  <div className="flex items-center gap-4 flex-wrap">
                    {p.due_date && (
                      <span className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        <Calendar className="w-3 h-3" />
                        {new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                    {p.budget != null && (
                      <span className="text-[12px] font-[500]" style={{ color: 'var(--text-muted)' }}>
                        {fmtBudget(p.budget, currency)}
                      </span>
                    )}
                  </div>
                )}

                {p.notes && (
                  <p className="text-[12px] line-clamp-2" style={{ color: 'var(--text-muted)' }}>{p.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

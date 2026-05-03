'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckSquare, Plus, Trash2, Loader2, Circle, Clock } from 'lucide-react'
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StatusStates'
import type { Task } from './page'

type FormState = { title: string; status: Task['status']; due_date: string; notes: string }
const EMPTY_FORM: FormState = { title: '', status: 'todo', due_date: '', notes: '' }

const STATUS_LABEL: Record<Task['status'], string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
}

const STATUS_COLOR: Record<Task['status'], { bg: string; text: string }> = {
  todo:        { bg: '#f3f4f6', text: '#6b7280' },
  in_progress: { bg: '#dbeafe', text: '#1d4ed8' },
  done:        { bg: '#dcfce7', text: '#16a34a' },
}

export function TasksClient({ initialTasks }: { initialTasks: Task[] | null }) {
  const [tasks,     setTasks]     = useState<Task[]>(initialTasks ?? [])
  const [loading,   setLoading]   = useState(initialTasks === null)
  const [error,     setError]     = useState<string | null>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState<FormState>(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (initialTasks === null) loadTasks()
  }, [initialTasks]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTasks() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/tasks')
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to load')
      setTasks(data as Task[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks')
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
    if (!form.title.trim()) { setFormError('Title is required'); return }
    setSaving(true); setFormError(null)
    try {
      const res = await fetch('/api/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:    form.title.trim(),
          status:   form.status,
          due_date: form.due_date || undefined,
          notes:    form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to add')
      setTasks(prev => [data as Task, ...prev])
      setForm(EMPTY_FORM); setShowForm(false)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to add task')
    } finally { setSaving(false) }
  }

  async function handleCycleStatus(task: Task) {
    const next: Record<Task['status'], Task['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    const newStatus = next[task.status]
    setToggling(task.id)
    try {
      const res  = await fetch(`/api/tasks/${task.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to update')
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status')
    } finally { setToggling(null) }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res  = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to delete')
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete task')
    } finally { setDeleting(null) }
  }

  if (loading) {
    return <LoadingState />
  }

  const groups: Task['status'][] = ['todo', 'in_progress', 'done']

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={loadTasks} />}

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {tasks.filter(t => t.status !== 'done').length} open · {tasks.filter(t => t.status === 'done').length} done
        </p>
        <button
          onClick={() => { setShowForm(v => !v); setTimeout(() => titleRef.current?.focus(), 50) }}
          className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="forge-card p-4 space-y-3">
          <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>New task</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
                Title <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input ref={titleRef} value={form.title} onChange={field('title')} placeholder="Task title" className="forge-input text-[13px]" />
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
              <select value={form.status} onChange={field('status')} className="forge-input text-[13px]">
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>Due Date</label>
              <input type="date" value={form.due_date} onChange={field('due_date')} className="forge-input text-[13px]" />
            </div>
            <div className="sm:col-span-2">
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
              Add Task
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

      {tasks.length === 0 && !showForm && (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6" style={{ color: '#9ca3af' }} />}
          title="No tasks yet"
          description="Add your first task to start tracking work."
        />
      )}

      {tasks.length > 0 && (
        <div className="space-y-6">
          {groups.map(status => {
            const group = tasks.filter(t => t.status === status)
            if (group.length === 0) return null
            const colors = STATUS_COLOR[status]
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[11px] font-[600] uppercase tracking-[0.06em] px-2 py-0.5 rounded-full"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{group.length}</span>
                </div>
                <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
                  {group.map((task, i) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: i < group.length - 1 ? '1px solid var(--card-border)' : undefined }}
                    >
                      <button
                        onClick={() => handleCycleStatus(task)}
                        disabled={toggling === task.id}
                        className="shrink-0 p-0.5"
                        title="Cycle status"
                      >
                        {toggling === task.id
                          ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                          : status === 'done'
                            ? <CheckSquare className="w-4 h-4" style={{ color: colors.text }} />
                            : <Circle className="w-4 h-4" style={{ color: colors.text }} />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[13px] font-[500]"
                          style={{ color: 'var(--text-primary)', textDecoration: status === 'done' ? 'line-through' : undefined, opacity: status === 'done' ? 0.6 : 1 }}
                        >
                          {task.title}
                        </p>
                        {(task.notes || task.due_date) && (
                          <div className="flex items-center gap-3 mt-0.5">
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                <Clock className="w-3 h-3" />
                                {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            {task.notes && (
                              <span className="text-[11px] truncate max-w-[300px]" style={{ color: 'var(--text-muted)' }}>{task.notes}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(task.id)}
                        disabled={deleting === task.id}
                        className="p-1.5 rounded-[6px] hover:bg-red-50 disabled:opacity-40 shrink-0"
                        style={{ color: '#e53e3e' }}
                      >
                        {deleting === task.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
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

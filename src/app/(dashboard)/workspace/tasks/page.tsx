import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { TasksClient } from './TasksClient'

export type Task = {
  id:         string
  title:      string
  status:     'todo' | 'in_progress' | 'done'
  due_date:   string | null
  notes:      string | null
  created_at: string
}

export default async function TasksPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('tasks')) redirect('/workspace')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, status, due_date, notes, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const tasks: Task[] | null = error ? null : (data ?? []) as Task[]

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Tasks
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Manage team tasks and track progress
        </p>
      </div>
      <TasksClient initialTasks={tasks} />
    </div>
  )
}

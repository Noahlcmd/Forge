import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { ProjectsClient } from './ProjectsClient'

export type Project = {
  id:          string
  name:        string
  status:      'active' | 'completed' | 'on_hold' | 'cancelled'
  client_name: string | null
  due_date:    string | null
  budget:      number | null
  notes:       string | null
  created_at:  string
}

export default async function ProjectsPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('projects')) redirect('/workspace')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const currency = (result.membership.organizations.settings?.currency as string | undefined) ?? 'USD'

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status, client_name, due_date, budget, notes, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const projects: Project[] | null = error ? null : (data ?? []) as Project[]

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Projects
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Track projects, clients, deadlines, and budgets
        </p>
      </div>
      <ProjectsClient initialProjects={projects} currency={currency} />
    </div>
  )
}

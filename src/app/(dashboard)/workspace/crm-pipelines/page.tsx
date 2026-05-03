import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { PipelinesClient } from './PipelinesClient'

export type Deal = {
  id:           string
  name:         string
  contact_name: string | null
  company:      string | null
  stage:        string
  value_cents:  number
  notes:        string | null
  created_at:   string
}

export default async function CrmPipelinesPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('crm-pipelines')) redirect('/workspace')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const { data, error } = await supabase
    .from('pipeline_deals')
    .select('id, name, contact_name, company, stage, value_cents, notes, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const deals: Deal[] | null = error ? null : (data ?? []) as Deal[]

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          CRM Pipelines
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Track deals and contacts through your sales pipeline
        </p>
      </div>
      <PipelinesClient initialDeals={deals} />
    </div>
  )
}

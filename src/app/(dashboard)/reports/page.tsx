import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { getDemoMode } from '@/lib/demo'
import { ReportsClient } from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createClient()
  const isDemo   = getDemoMode()
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  const orgId = result.ok ? result.membership.organizations.id : null

  let customerCount = 0
  let leadCount     = 0
  let totalIncome   = 0
  let totalExpenses = 0

  if (isDemo) {
    customerCount = 142
    leadCount     = 38
    totalIncome   = 2180000
    totalExpenses =  430000
  } else if (orgId) {
    const [custRes, leadRes, txRes] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('transactions').select('type, amount_cents').eq('organization_id', orgId),
    ])
    if (custRes.error) console.error('[reports] customers count:', custRes.error.message)
    if (leadRes.error) console.error('[reports] leads count:', leadRes.error.message)
    if (txRes.error)   console.error('[reports] transactions query:', txRes.error.message)
    customerCount = custRes.count ?? 0
    leadCount     = leadRes.count ?? 0
    for (const tx of txRes.data ?? []) {
      if (tx.type === 'income')  totalIncome   += tx.amount_cents ?? 0
      if (tx.type === 'expense') totalExpenses += tx.amount_cents ?? 0
    }
  }

  const hasData = isDemo || totalIncome > 0 || totalExpenses > 0 || customerCount > 0

  return (
    <ReportsClient
      data={{ customerCount, leadCount, totalIncome, totalExpenses, hasData }}
    />
  )
}

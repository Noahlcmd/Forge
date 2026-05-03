import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSafeHandler } from '@/lib/safe-server'
import { sanitizeSearchQuery } from '@/lib/sanitize'

export type SearchResult = {
  id:    string
  name:  string
  sub:   string
  route: string
  type:  'customer' | 'lead' | 'campaign'
}

export type SearchResponse = {
  customers: SearchResult[]
  leads:     SearchResult[]
  campaigns: SearchResult[]
}

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

export const GET = withSafeHandler(async (req: Request) => {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''

  if (!q || q.length < 2) {
    return NextResponse.json<SearchResponse>({ customers: [], leads: [], campaigns: [] })
  }

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  // Strip all PostgREST metacharacters to prevent filter injection in .or() queries.
  // sanitizeSearchQuery strips: , ( ) ' " ; \ % _
  const safeQ   = sanitizeSearchQuery(q)
  const pattern = `%${safeQ}%`

  const [custRes, leadsRes, campaignsRes] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, email, company')
      .eq('organization_id', orgId)
      .or(`name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern}`)
      .limit(5),

    supabase
      .from('leads')
      .select('id, name, email, company, stage')
      .eq('organization_id', orgId)
      .or(`name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern}`)
      .limit(5),

    supabase
      .from('campaigns')
      .select('id, name, platform, status')
      .eq('organization_id', orgId)
      .ilike('name', pattern)
      .limit(5),
  ])

  const customers: SearchResult[] = (custRes.data ?? []).map(c => ({
    id:    c.id,
    name:  c.name,
    sub:   c.company ?? c.email ?? 'Customer',
    route: '/customers',
    type:  'customer',
  }))

  const leads: SearchResult[] = (leadsRes.data ?? []).map(l => ({
    id:    l.id,
    name:  l.name ?? l.company ?? 'Lead',
    sub:   l.company ?? l.email ?? l.stage ?? 'Lead',
    route: '/leads',
    type:  'lead',
  }))

  const campaigns: SearchResult[] = (campaignsRes.data ?? []).map(c => ({
    id:    c.id,
    name:  c.name,
    sub:   [c.platform, c.status].filter(Boolean).join(' · ') || 'Campaign',
    route: '/ads',
    type:  'campaign',
  }))

  return NextResponse.json<SearchResponse>({ customers, leads, campaigns })
})

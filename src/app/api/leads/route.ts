import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { LeadInsertSchema } from '@/lib/schemas/lead'
import { withSafeHandler } from '@/lib/safe-server'

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return { orgId: data?.organization_id ?? null, error }
}

const LEAD_SELECT = 'id, name, company, contact_name, email, phone, industry, location, size, revenue, score, status, stage, created_at'

export const GET = withSafeHandler(async () => {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId, error: membershipError } = await getOrgId(supabase, user.id)
  if (membershipError) {
    return NextResponse.json({ error: 'Failed to fetch membership' }, { status: 500 })
  }
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = LeadInsertSchema.safeParse(raw)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { orgId, error: membershipError } = await getOrgId(supabase, user.id)
  if (membershipError) {
    return NextResponse.json({ error: 'Failed to fetch membership' }, { status: 500 })
  }
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization' }, { status: 400 })
  }

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      organization_id: orgId,
      name: parsed.data.company,
      ...parsed.data,
      status: 'new',
    })
    .select(LEAD_SELECT)
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const admin = createAdminClient()
  await admin.from('notifications').insert({
    organization_id: orgId,
    user_id:         user.id,
    title:           'New lead added',
    description:     parsed.data.company,
    link:            '/leads',
  })

  return NextResponse.json(lead, { status: 201 })
})

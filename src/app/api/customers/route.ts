import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const InsertSchema = z.object({
  name:    z.string().trim().min(1, 'Name is required'),
  email:   z.preprocess(
    v => (typeof v === 'string' ? v.trim() || undefined : v),
    z.string().email('Invalid email address').optional(),
  ),
  phone:   z.string().trim().optional(),
  company: z.string().trim().optional(),
})

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return { orgId: data?.organization_id ?? null, error }
}

export const GET = withSafeHandler(async () => {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orgId, error: membershipError } = await getOrgId(supabase, user.id)
  if (membershipError) return NextResponse.json({ error: 'Failed to fetch membership' }, { status: 500 })
  if (!orgId) return NextResponse.json({ error: 'No active organization membership found' }, { status: 400 })

  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, company, status, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try { raw = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = InsertSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })
  }

  const { orgId, error: membershipError } = await getOrgId(supabase, user.id)
  if (membershipError) return NextResponse.json({ error: 'Failed to fetch membership' }, { status: 500 })
  if (!orgId) return NextResponse.json({ error: 'No active organization membership found' }, { status: 400 })

  const admin = createAdminClient()
  const { data: customer, error: insertError } = await admin
    .from('customers')
    .insert({
      name:            parsed.data.name,
      email:           parsed.data.email?.trim() || null,
      phone:           parsed.data.phone?.trim() || null,
      company:         parsed.data.company?.trim() || null,
      organization_id: orgId,
      created_by:      user.id,
    })
    .select('id, name, email, phone, company, status, created_at')
    .single()

  if (insertError) {
    console.error('[customers] insert error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await admin.from('notifications').insert({
    organization_id: orgId,
    user_id:         user.id,
    title:           'New customer added',
    description:     parsed.data.name,
    link:            '/customers',
  })

  return NextResponse.json(customer, { status: 201 })
})

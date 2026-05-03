import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const OutreachInsertSchema = z.object({
  name:       z.string().trim().min(1, 'Sequence name is required'),
  from_name:  z.string().trim().min(1).optional(),
  from_email: z.string().trim().email('Invalid email').optional(),
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
  if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 400 })

  const { data, error } = await supabase
    .from('outreach')
    .select('id, name, status, from_name, from_email, created_at')
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

  const parsed = OutreachInsertSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })
  }

  const { orgId, error: membershipError } = await getOrgId(supabase, user.id)
  if (membershipError) return NextResponse.json({ error: 'Failed to fetch membership' }, { status: 500 })
  if (!orgId) return NextResponse.json({ error: 'No active organization' }, { status: 400 })

  const { data, error } = await supabase
    .from('outreach')
    .insert({
      organization_id: orgId,
      created_by:      user.id,
      ...parsed.data,
    })
    .select('id, name, status, from_name, from_email, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
})

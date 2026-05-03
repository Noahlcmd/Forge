import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

export const GET = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const calendarId = searchParams.get('calendar_id')
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  let query = supabase
    .from('events')
    .select('id, calendar_id, title, description, location, start_at, end_at, all_day')
    .eq('organization_id', orgId)

  if (calendarId) query = query.eq('calendar_id', calendarId)
  if (from)       query = query.gte('start_at', from)
  if (to)         query = query.lte('start_at', to)

  const { data, error } = await query.order('start_at', { ascending: true }).limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
})

const createSchema = z.object({
  calendar_id: z.string().uuid(),
  title:       z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  location:    z.string().max(500).optional(),
  start_at:    z.string().datetime(),
  end_at:      z.string().datetime(),
  all_day:     z.boolean().optional(),
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('events')
    .insert({ ...parsed.data, organization_id: orgId, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
})

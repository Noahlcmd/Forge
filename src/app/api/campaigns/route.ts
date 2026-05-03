import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const Schema = z.object({
  name:            z.string().trim().min(1),
  ad_copy:         z.string().optional(),
  budget_cents:    z.number().int().min(0).optional(),
  target_audience: z.record(z.string(), z.unknown()).optional(),
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try { raw = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.organization_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: campaign, error } = await admin
    .from('campaigns')
    .insert({
      organization_id: membership.organization_id,
      name:            parsed.data.name,
      ad_copy:         parsed.data.ad_copy ?? null,
      budget_cents:    parsed.data.budget_cents ?? 0,
      target_audience: parsed.data.target_audience ?? {},
      status:          'draft',
      created_by:      user.id,
    })
    .select('id, name, status, created_at')
    .single()

  if (error) {
    console.error('[campaigns] insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(campaign, { status: 201 })
})

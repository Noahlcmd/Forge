import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'] as const

const Schema = z.object({
  name:          z.string().trim().min(1).optional(),
  // Accept empty string ("") as equivalent to null — client may send "" to clear
  logo_url:      z.preprocess(
    v => (v === '' ? null : v),
    z.string().url().nullable().optional(),
  ),
  industry:      z.string().optional(),
  business_type: z.string().optional(),
  currency:      z.enum(VALID_CURRENCIES).optional(),
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 })
  }
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const update: Record<string, unknown> = {}
  if (parsed.data.name          !== undefined) update.name          = parsed.data.name
  if (parsed.data.logo_url      !== undefined) update.logo_url      = parsed.data.logo_url
  if (parsed.data.industry      !== undefined) update.industry      = parsed.data.industry
  if (parsed.data.business_type !== undefined) update.business_type = parsed.data.business_type

  if (parsed.data.currency !== undefined) {
    // Merge into existing settings jsonb so other keys are preserved
    const { data: existing } = await admin
      .from('organizations')
      .select('settings')
      .eq('id', membership.organization_id)
      .single()
    const currentSettings = (existing?.settings as Record<string, unknown>) ?? {}
    update.settings = { ...currentSettings, currency: parsed.data.currency }
  }
  const { error } = await admin.from('organizations').update(update).eq('id', membership.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

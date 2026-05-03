import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const VALID_PROVIDERS = [
  'stripe', 'gmail', 'outlook', 'google_calendar', 'apollo', 'hunter',
  'google_ads', 'meta_ads', 'linkedin_ads', 'tiktok_ads', 'slack', 'shopify', 'webhook',
] as const

const UpsertSchema = z.object({
  provider:    z.enum(VALID_PROVIDERS),
  status:      z.enum(['connected', 'disconnected']),
  credentials: z.record(z.string(), z.unknown()).optional(),
  metadata:    z.record(z.string(), z.unknown()).optional(),
})

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

export const GET = withSafeHandler(async () => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const { data, error } = await supabase
    .from('integrations')
    .select('id, provider, status, metadata, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('provider')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try { raw = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpsertSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })
  }

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('integrations')
    .upsert(
      {
        organization_id: orgId,
        provider:        parsed.data.provider,
        status:          parsed.data.status,
        credentials:     parsed.data.credentials ?? {},
        metadata:        parsed.data.metadata    ?? {},
        created_by:      user.id,
      },
      { onConflict: 'organization_id,provider' }
    )
    .select('id, provider, status, metadata, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (parsed.data.status === 'connected') {
    await admin.from('notifications').insert({
      organization_id: orgId,
      user_id:         user.id,
      title:           'Integration connected',
      description:     parsed.data.provider.replace(/_/g, ' '),
      link:            '/settings',
    })
  }

  return NextResponse.json(data)
})

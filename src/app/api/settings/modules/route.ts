import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const Schema = z.object({
  enabled_modules: z.array(z.string()),
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
    return NextResponse.json({ error: 'Invalid modules list' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.organization_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizations')
    .update({ enabled_modules: parsed.data.enabled_modules })
    .eq('id', membership.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

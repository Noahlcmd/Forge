import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

async function getOrgAndRole(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships')
    .select('organization_id, role')
    .eq('user_id', userId)
    .maybeSingle()
  return data ?? null
}

const patchSchema = z.object({
  is_pinned: z.boolean().optional(),
  name:      z.string().min(1).max(80).optional(),
})

export const PATCH = withSafeHandler(async (
  req: Request,
  { params }: { params: { id: string } },
) => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getOrgAndRole(supabase, user.id)
  if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })

  // Verify channel belongs to org
  const { data: channel } = await supabase
    .from('chat_channels')
    .select('id, organization_id')
    .eq('id', params.id)
    .eq('organization_id', membership.organization_id)
    .maybeSingle()

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('chat_channels')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('organization_id', membership.organization_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
})

export const DELETE = withSafeHandler(async (
  _req: Request,
  { params }: { params: { id: string } },
) => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getOrgAndRole(supabase, user.id)
  if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  // Only admins/owners can delete channels
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only admins can delete channels' }, { status: 403 })
  }

  // Verify channel belongs to org
  const { data: channel } = await supabase
    .from('chat_channels')
    .select('id, organization_id')
    .eq('id', params.id)
    .eq('organization_id', membership.organization_id)
    .maybeSingle()

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('chat_channels')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', membership.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler } from '@/lib/safe-server'

export const POST = withSafeHandler(async (
  _req: Request,
  { params }: { params: { id: string } },
) => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  // Verify channel belongs to org
  const { data: channel } = await supabase
    .from('chat_channels')
    .select('id')
    .eq('id', params.id)
    .eq('organization_id', membership.organization_id)
    .maybeSingle()

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const admin = createAdminClient()

  // Upsert a left_at record for this user — org_id required for RLS
  const { error } = await admin
    .from('channel_memberships')
    .upsert(
      {
        organization_id: membership.organization_id,
        channel_id:      params.id,
        user_id:         user.id,
        left_at:         new Date().toISOString(),
      },
      { onConflict: 'channel_id,user_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

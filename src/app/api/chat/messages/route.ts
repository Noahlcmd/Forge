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
  const channelId = searchParams.get('channel_id')
  if (!channelId) return NextResponse.json({ error: 'channel_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, content, created_at, user_id, profiles(full_name, email, avatar_url)')
    .eq('channel_id', channelId)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
})

const sendSchema = z.object({
  channel_id: z.string().uuid(),
  content:    z.string().min(1).max(4000),
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 403 })

  const body = await req.json()
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })

  // Verify the channel belongs to this org before writing — prevents cross-org channel writes
  const { data: channel } = await supabase
    .from('chat_channels')
    .select('id')
    .eq('id', parsed.data.channel_id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('chat_messages')
    .insert({ organization_id: orgId, channel_id: parsed.data.channel_id, user_id: user.id, content: parsed.data.content })
    .select('id, content, created_at, user_id, profiles(full_name, email, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
})

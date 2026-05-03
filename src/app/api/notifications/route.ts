import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler } from '@/lib/safe-server'

export type Notification = {
  id:          string
  title:       string
  description: string | null
  link:        string | null
  read:        boolean
  created_at:  string
}

async function getContext(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: m } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return m?.organization_id ? { user, orgId: m.organization_id } : null
}

// GET — fetch latest 30 notifications for the user's org
export const GET = withSafeHandler(async () => {
  const supabase = createClient()
  const ctx = await getContext(supabase)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, description, link, read, created_at')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
})

// PATCH — mark all as read (or a specific one if id is passed)
export const PATCH = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const ctx = await getContext(supabase)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { id?: string }
  const id: string | null = body.id ?? null

  const admin = createAdminClient()
  const query = admin.from('notifications').update({ read: true })

  if (id) {
    const { error } = await query.eq('id', id).eq('organization_id', ctx.orgId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Mark all unread as read for this org
    const { error } = await query.eq('organization_id', ctx.orgId).eq('read', false)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
})

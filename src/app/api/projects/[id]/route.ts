import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'
import { withSafeHandler } from '@/lib/safe-server'

const PatchSchema = z.object({
  name:        z.string().trim().min(1).optional(),
  status:      z.enum(['active','completed','on_hold','cancelled']).optional(),
  client_name: z.string().trim().optional(),
  due_date:    z.string().optional(),
  budget:      z.number().int().nonnegative().optional(),
  notes:       z.string().optional(),
})

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('memberships').select('organization_id').eq('user_id', userId).maybeSingle()
  return data?.organization_id ?? null
}

export const PATCH = withSafeHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = PatchSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })
  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  const { data, error } = await supabase.from('projects').update(parsed.data).eq('id', params.id).eq('organization_id', orgId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (parsed.data.status) {
    const label: Record<string, string> = { active: 'Active', completed: 'Completed', on_hold: 'On Hold', cancelled: 'Cancelled' }
    createNotification({
      organizationId: orgId,
      title:          `Project status: "${label[parsed.data.status] ?? parsed.data.status}"`,
      description:    data.name,
      link:           '/workspace/projects',
    }).catch(() => {})
  }
  return NextResponse.json(data)
})

export const DELETE = withSafeHandler(async (_: Request, { params }: { params: { id: string } }) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  const { error } = await supabase.from('projects').delete().eq('id', params.id).eq('organization_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

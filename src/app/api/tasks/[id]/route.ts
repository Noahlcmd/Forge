import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'
import { withSafeHandler } from '@/lib/safe-server'

const PatchSchema = z.object({
  title:    z.string().trim().min(1).optional(),
  status:   z.enum(['todo','in_progress','done']).optional(),
  due_date: z.string().nullable().optional(),
  notes:    z.string().optional(),
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
  const { data, error } = await supabase.from('tasks').update(parsed.data).eq('id', params.id).eq('organization_id', orgId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (parsed.data.status) {
    const label: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
    createNotification({
      organizationId: orgId,
      title:          `Task marked "${label[parsed.data.status] ?? parsed.data.status}"`,
      description:    data.title,
      link:           '/workspace/tasks',
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
  const { error } = await supabase.from('tasks').delete().eq('id', params.id).eq('organization_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

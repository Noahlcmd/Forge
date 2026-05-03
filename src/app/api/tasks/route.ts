import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { createNotification } from '@/lib/notifications'
import { withSafeHandler } from '@/lib/safe-server'

const Schema = z.object({
  title:    z.string().trim().min(1),
  status:   z.enum(['todo','in_progress','done']).optional(),
  due_date: z.string().nullable().optional(),
  notes:    z.string().optional(),
})

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('memberships').select('organization_id').eq('user_id', userId).maybeSingle()
  return data?.organization_id ?? null
}

export const GET = withSafeHandler(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  const { data, error } = await supabase.from('tasks').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })
  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  const { data, error } = await supabase.from('tasks').insert({ ...parsed.data, organization_id: orgId, created_by: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  createNotification({
    organizationId: orgId,
    title:          `New task: ${data.title}`,
    description:    data.due_date ? `Due ${new Date(data.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : undefined,
    link:           '/workspace/tasks',
  }).catch(() => {})
  return NextResponse.json(data, { status: 201 })
})

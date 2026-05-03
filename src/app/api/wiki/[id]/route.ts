import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const PatchSchema = z.object({
  title:   z.string().trim().min(1).optional(),
  content: z.string().optional(),
})

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships').select('organization_id').eq('user_id', userId).maybeSingle()
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
  const { data, error } = await supabase
    .from('wiki_pages')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .select('id, title, slug, content, created_at, updated_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
})

export const DELETE = withSafeHandler(async (_: Request, { params }: { params: { id: string } }) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  const { error } = await supabase
    .from('wiki_pages')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

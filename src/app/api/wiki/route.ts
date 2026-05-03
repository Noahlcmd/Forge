import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const Schema = z.object({
  title:   z.string().trim().min(1, 'Title is required'),
  content: z.string().default(''),
})

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships').select('organization_id').eq('user_id', userId).maybeSingle()
  return data?.organization_id ?? null
}

export const GET = withSafeHandler(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })
  const { data, error } = await supabase
    .from('wiki_pages')
    .select('id, title, slug, content, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
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

  // Ensure unique slug within org
  let slug = toSlug(parsed.data.title) || 'page'
  const { data: existing } = await supabase
    .from('wiki_pages')
    .select('id')
    .eq('organization_id', orgId)
    .eq('slug', slug)
    .maybeSingle()
  if (existing) slug = `${slug}-${Date.now()}`

  const { data, error } = await supabase
    .from('wiki_pages')
    .insert({
      title:           parsed.data.title,
      slug,
      content:         parsed.data.content,
      organization_id: orgId,
      created_by:      user.id,
    })
    .select('id, title, slug, content, created_at, updated_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
})

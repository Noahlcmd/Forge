import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const PatchSchema = z.object({
  name:      z.string().trim().min(1).optional(),
  file_url:  z.string().url().optional().or(z.literal('')),
  file_type: z.string().trim().optional(),
  notes:     z.string().optional(),
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
  const { data, error } = await supabase.from('files').update(parsed.data).eq('id', params.id).eq('organization_id', orgId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
})

export const DELETE = withSafeHandler(async (_: Request, { params }: { params: { id: string } }) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  // Fetch before delete so we can clean up storage if needed
  const { data: file } = await supabase.from('files').select('file_url').eq('id', params.id).eq('organization_id', orgId).maybeSingle()

  const { error } = await supabase.from('files').delete().eq('id', params.id).eq('organization_id', orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort: delete from Supabase Storage if it was uploaded there
  if (file?.file_url) {
    const BUCKET = 'org-files'
    const marker = `/object/public/${BUCKET}/`
    const idx    = file.file_url.indexOf(marker)
    if (idx !== -1) {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()
      const storagePath = file.file_url.slice(idx + marker.length)
      await admin.storage.from(BUCKET).remove([storagePath]).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
})

/**
 * API [id] ROUTE TEMPLATE — copy to src/app/api/<module>/[id]/route.ts
 */

import { NextResponse }             from 'next/server'
import { createClient }             from '@/lib/supabase/server'
import { createAdminClient }        from '@/lib/supabase/admin'
import { withSafeHandler, apiErr }  from '@/lib/safe-server'
import { z }                        from 'zod'

const PatchSchema = z.object({
  name:  z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
})

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

// ── PATCH /api/things/[id] ─────────────────────────────────────────────────

export const PATCH = withSafeHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('Unauthorized', 401)

  let raw: unknown
  try { raw = await req.json() } catch { return apiErr('Invalid JSON', 400) }

  const parsed = PatchSchema.safeParse(raw)
  if (!parsed.success) return apiErr(parsed.error.issues[0]?.message ?? 'Invalid', 400)

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return apiErr('No active organization', 400)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('things')
    .update(parsed.data)
    .eq('id', params.id)
    .eq('organization_id', orgId)        // always scope to org — defense in depth
    .select('id, name, notes, created_at')
    .single()

  if (error) {
    console.error('[things PATCH]', error.message)
    return apiErr('Failed to update item', 500)
  }

  return NextResponse.json(data)
})

// ── DELETE /api/things/[id] ────────────────────────────────────────────────

export const DELETE = withSafeHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('Unauthorized', 401)

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return apiErr('No active organization', 400)

  const admin = createAdminClient()
  const { error } = await admin
    .from('things')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', orgId)        // always scope to org

  if (error) {
    console.error('[things DELETE]', error.message)
    return apiErr('Failed to delete item', 500)
  }

  return NextResponse.json({ ok: true })
})

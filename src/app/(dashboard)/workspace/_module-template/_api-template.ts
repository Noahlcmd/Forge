/**
 * API ROUTE TEMPLATE — copy to src/app/api/<module>/route.ts
 * Replace "things" / "Thing" with your entity name.
 * All handlers are wrapped with withSafeHandler — any uncaught exception
 * becomes a clean 500 with no internal details leaked.
 */

import { NextResponse }          from 'next/server'
import { createClient }          from '@/lib/supabase/server'
import { createAdminClient }     from '@/lib/supabase/admin'
import { withSafeHandler, apiErr } from '@/lib/safe-server'
import { sanitizeInput }         from '@/lib/sanitize'
import { z }                     from 'zod'

// ── Validation schema ──────────────────────────────────────────────────────

const InsertSchema = z.object({
  name:  z.string().trim().min(1, 'Name is required').max(200),
  notes: z.string().trim().max(2000).optional(),
})

// ── Org helper ─────────────────────────────────────────────────────────────

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

// ── GET /api/things ────────────────────────────────────────────────────────

export const GET = withSafeHandler(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('Unauthorized', 401)

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return apiErr('No active organization', 400)

  const { data, error } = await supabase
    .from('things')
    .select('id, name, notes, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[things GET]', error.message)
    return apiErr('Failed to load items', 500)
  }

  return NextResponse.json(data ?? [])
})

// ── POST /api/things ───────────────────────────────────────────────────────

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('Unauthorized', 401)

  let raw: unknown
  try { raw = await req.json() } catch { return apiErr('Invalid JSON', 400) }

  const parsed = InsertSchema.safeParse(raw)
  if (!parsed.success) return apiErr(parsed.error.issues[0]?.message ?? 'Invalid', 400)

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return apiErr('No active organization', 400)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('things')
    .insert({
      organization_id: orgId,
      created_by:      user.id,
      name:            sanitizeInput(parsed.data.name),
      notes:           parsed.data.notes ? sanitizeInput(parsed.data.notes, 2000) : null,
    })
    .select('id, name, notes, created_at')
    .single()

  if (error) {
    console.error('[things POST]', error.message)
    return apiErr('Failed to create item', 500)
  }

  return NextResponse.json(data, { status: 201 })
})

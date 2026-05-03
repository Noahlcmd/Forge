import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const InsertSchema = z.object({
  name:     z.string().trim().min(1, 'Name is required').max(200),
  quantity: z.number().int().min(0, 'Quantity must be 0 or more').default(0),
  unit:     z.string().trim().max(50).optional(),
  notes:    z.string().trim().max(500).optional(),
})

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

export const GET = withSafeHandler(async () => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, quantity, unit, notes, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try { raw = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = InsertSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })
  }

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      organization_id: orgId,
      created_by:      user.id,
      name:            parsed.data.name,
      quantity:        parsed.data.quantity,
      unit:            parsed.data.unit ?? null,
      notes:           parsed.data.notes ?? null,
    })
    .select('id, name, quantity, unit, notes, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
})

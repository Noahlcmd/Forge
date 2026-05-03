import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const InsertSchema = z.object({
  name:           z.string().trim().min(1),
  locations:      z.array(z.string()).default([]),
  industries:     z.array(z.string()).default([]),
  company_sizes:  z.array(z.string()).default([]),
  job_titles:     z.array(z.string()).default([]),
  platforms:      z.array(z.string()).default([]),
  estimated_size: z.number().int().positive().nullable().optional(),
})

async function getContext() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: m } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return m?.organization_id ? { user, orgId: m.organization_id, supabase } : null
}

export const GET = withSafeHandler(async () => {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await ctx.supabase
    .from('audiences')
    .select('id, name, locations, industries, company_sizes, job_titles, platforms, estimated_size, created_at')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
})

export const POST = withSafeHandler(async (req: Request) => {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try { raw = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = InsertSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('audiences')
    .insert({
      organization_id: ctx.orgId,
      created_by:      ctx.user.id,
      ...parsed.data,
    })
    .select('id, name, locations, industries, company_sizes, job_titles, platforms, estimated_size, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
})

export const DELETE = withSafeHandler(async (req: Request) => {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('audiences')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

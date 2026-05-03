import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSafeHandler } from '@/lib/safe-server'

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

export const DELETE = withSafeHandler(async (
  _req: Request,
  { params }: { params: { id: string } }
) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  const { error } = await supabase
    .from('calendars')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', orgId)   // scoped to this org for safety

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
})

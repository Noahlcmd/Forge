import { createClient } from '@/lib/supabase/server'
import { withSafeHandler, apiErr, apiOk } from '@/lib/safe-server'

// GET /api/team/invites — list pending (not accepted, not revoked, not expired) invites for the caller's org
export const GET = withSafeHandler(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('Unauthorized', 401)

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.organization_id) return apiErr('No organization', 400)
  if (!['owner', 'admin'].includes(membership.role)) return apiErr('Forbidden', 403)

  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, expires_at, created_at, invited_by, profiles(full_name, email)')
    .eq('organization_id', membership.organization_id)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[team/invites] query error:', error.message)
    return apiErr('Failed to load invitations.', 500)
  }

  return apiOk(data ?? [])
})

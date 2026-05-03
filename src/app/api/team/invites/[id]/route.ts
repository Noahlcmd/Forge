import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler, apiErr, apiOk } from '@/lib/safe-server'

// DELETE /api/team/invites/[id] — revoke a pending invite
export const DELETE = withSafeHandler(async (req: Request, { params }: { params: { id: string } }) => {
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

  const admin = createAdminClient()

  // Scope revoke to this org to prevent cross-org tampering
  const { data: invite, error: fetchErr } = await admin
    .from('invitations')
    .select('id, accepted_at')
    .eq('id', params.id)
    .eq('organization_id', membership.organization_id)
    .is('revoked_at', null)
    .maybeSingle()

  if (fetchErr || !invite) return apiErr('Invitation not found.', 404)
  if (invite.accepted_at) return apiErr('Cannot revoke an accepted invitation.', 409)

  const { error } = await admin
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', params.id)

  if (error) {
    console.error('[team/invites/revoke] error:', error.message)
    return apiErr('Failed to revoke invitation.', 500)
  }

  return apiOk({ ok: true })
})

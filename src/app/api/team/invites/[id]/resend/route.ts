import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler, apiErr, apiOk } from '@/lib/safe-server'
import { sendInviteEmail } from '@/lib/email'

// POST /api/team/invites/[id]/resend — regenerate token + reset expiry, resend email
export const POST = withSafeHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('Unauthorized', 401)

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, role, profiles(full_name, email), organizations(name)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.organization_id) return apiErr('No organization', 400)
  if (!['owner', 'admin'].includes(membership.role)) return apiErr('Forbidden', 403)

  const admin     = createAdminClient()
  const orgId     = membership.organization_id
  const profile   = membership.profiles as unknown as { full_name: string | null; email: string } | null
  const org       = membership.organizations as unknown as { name: string } | null
  const inviterName = profile?.full_name ?? profile?.email ?? 'A teammate'
  const orgName   = org?.name ?? 'your organization'

  // Fetch the invite — must belong to this org, not accepted, not revoked
  const { data: invite, error: fetchErr } = await admin
    .from('invitations')
    .select('id, email, role, accepted_at, revoked_at')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (fetchErr || !invite) return apiErr('Invitation not found.', 404)
  if (invite.accepted_at) return apiErr('This invitation has already been accepted.', 409)
  if (invite.revoked_at)  return apiErr('This invitation has been revoked.', 409)

  // Regenerate token + reset 24h expiry
  const newToken   = crypto.randomUUID()
  const newExpiry  = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: updateErr } = await admin
    .from('invitations')
    .update({ token: newToken, expires_at: newExpiry })
    .eq('id', params.id)

  if (updateErr) {
    console.error('[team/invites/resend] update error:', updateErr.message)
    return apiErr('Failed to refresh invitation.', 500)
  }

  const origin     = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteLink = `${origin}/accept-invite?token=${newToken}`

  const emailResult = await sendInviteEmail({
    to:          invite.email,
    inviterName,
    orgName,
    role:        invite.role,
    inviteLink,
  })

  if (!emailResult.ok) {
    console.warn('[team/invites/resend] Email failed:', emailResult.error)
    return apiOk({ ok: true, inviteLink, emailSent: false })
  }

  return apiOk({ ok: true, emailSent: true })
})

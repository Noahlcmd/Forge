import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler, apiErr, apiOk } from '@/lib/safe-server'
import { z } from 'zod'

const Schema = z.object({
  token: z.string().min(1),
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('You must be signed in to accept an invitation.', 401)

  let raw: unknown
  try { raw = await req.json() } catch { return apiErr('Invalid JSON', 400) }
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) return apiErr('Invalid token.', 400)

  const admin = createAdminClient()

  // Look up invitation by token — use admin client to bypass RLS
  const { data: invite, error: fetchErr } = await admin
    .from('invitations')
    .select('id, organization_id, email, role, expires_at, accepted_at, revoked_at')
    .eq('token', parsed.data.token)
    .maybeSingle()

  if (fetchErr || !invite) return apiErr('Invitation not found or has expired.', 404)

  // Single-use: already accepted
  if (invite.accepted_at) return apiErr('This invitation has already been used.', 409)

  // Revoked
  if (invite.revoked_at) return apiErr('This invitation has been cancelled.', 410)

  // Expired
  if (new Date(invite.expires_at) < new Date()) return apiErr('This invitation has expired. Please ask for a new one.', 410)

  // Email must match — prevents someone else from stealing the invite
  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile) return apiErr('User profile not found.', 400)

  if (profile.email.toLowerCase() !== invite.email.toLowerCase()) {
    return apiErr(
      `This invitation was sent to ${invite.email}. Please sign in with that email address.`,
      403,
    )
  }

  // Upsert membership — handles the case where the user somehow already has one
  const { error: memberErr } = await admin
    .from('memberships')
    .upsert(
      {
        user_id:         user.id,
        organization_id: invite.organization_id,
        role:            invite.role,
        invited_by:      null,
        accepted_at:     new Date().toISOString(),
      },
      { onConflict: 'user_id,organization_id' },
    )

  if (memberErr) {
    console.error('[invite/accept] membership upsert error:', memberErr.message)
    return apiErr('Failed to join organization.', 500)
  }

  // Mark invitation as accepted (single-use enforcement)
  const { error: markErr } = await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  if (markErr) {
    // Non-fatal — membership was created; log and continue
    console.error('[invite/accept] failed to mark accepted:', markErr.message)
  }

  return apiOk({ ok: true })
})

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler, apiErr, apiOk } from '@/lib/safe-server'
import { sendInviteEmail } from '@/lib/email'
import { z } from 'zod'

const Schema = z.object({
  email: z.string().email(),
  role:  z.enum(['admin', 'employee']),
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('Unauthorized', 401)

  let raw: unknown
  try { raw = await req.json() } catch { return apiErr('Invalid JSON', 400) }
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) return apiErr(parsed.error.issues[0]?.message ?? 'Invalid', 400)

  // Verify caller is admin/owner of their org
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, role, profiles(full_name, email), organizations(name)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.organization_id) return apiErr('No organization', 400)
  if (!['owner', 'admin'].includes(membership.role)) return apiErr('Only owners and admins can invite members', 403)

  const orgId      = membership.organization_id
  const profile    = membership.profiles as unknown as { full_name: string | null; email: string } | null
  const org        = membership.organizations as unknown as { name: string } | null
  const inviterName = profile?.full_name ?? profile?.email ?? 'A teammate'
  const orgName    = org?.name ?? 'your organization'

  // Check if this email already has a pending, non-revoked invite for this org
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('invitations')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', parsed.data.email)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing) return apiErr('A pending invite already exists for this email.', 409)

  // Create invitation (24h expiry via column default)
  const { data: invitation, error: invErr } = await admin
    .from('invitations')
    .insert({
      organization_id: orgId,
      email:           parsed.data.email,
      role:            parsed.data.role,
      invited_by:      user.id,
    })
    .select('id, token')
    .single()

  if (invErr || !invitation) {
    console.error('[team/invite] DB error:', invErr?.message)
    return apiErr('Failed to create invitation.', 500)
  }

  const origin     = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteLink = `${origin}/accept-invite?token=${invitation.token}`

  // Send email via Resend
  const emailResult = await sendInviteEmail({
    to:          parsed.data.email,
    inviterName,
    orgName,
    role:        parsed.data.role,
    inviteLink,
  })

  if (!emailResult.ok) {
    console.warn('[team/invite] Email failed:', emailResult.error, '— returning invite link')
    // Don't fail the request — admin can copy the link
    return apiOk({ ok: true, inviteLink, emailSent: false })
  }

  return apiOk({ ok: true, emailSent: true })
})

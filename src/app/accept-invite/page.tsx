import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { AcceptInviteClient } from './AcceptInviteClient'

interface Props {
  searchParams: { token?: string }
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const token = searchParams.token?.trim()

  // ── No token ──────────────────────────────────────────────────────────────
  if (!token) {
    return <ErrorPage message="Missing invite token. Check the link in your email." />
  }

  // ── Look up invitation using admin client (bypasses RLS) ──────────────────
  const admin = createAdminClient()
  const { data: invite, error } = await admin
    .from('invitations')
    .select('id, organization_id, email, role, expires_at, accepted_at, revoked_at, organizations(name)')
    .eq('token', token)
    .maybeSingle()

  if (error || !invite) {
    return <ErrorPage message="Invitation not found. It may have been revoked or the link is invalid." />
  }

  if (invite.accepted_at) {
    return <ErrorPage message="This invitation has already been used." />
  }

  if (invite.revoked_at) {
    return <ErrorPage message="This invitation has been cancelled." />
  }

  if (new Date(invite.expires_at) < new Date()) {
    return <ErrorPage message="This invitation has expired. Please ask for a new one." />
  }

  // ── Check if the visitor is already logged in ─────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userEmail: string | null = null
  if (user) {
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()
    userEmail = profile?.email ?? null
  }

  const org = invite.organizations as unknown as { name: string } | null
  const orgName = org?.name ?? 'the organization'

  return (
    <AcceptInviteClient
      token={token}
      orgName={orgName}
      role={invite.role}
      email={invite.email}
      userEmail={userEmail}
    />
  )
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0d0f14' }}>
      <div className="w-full max-w-sm rounded-[16px] p-8 text-center" style={{ background: '#111318', border: '1px solid #1e2128' }}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-xl">✕</span>
        </div>
        <h2 className="text-[18px] font-[600] text-white mb-2">Invalid invitation</h2>
        <p className="text-[13px] text-zinc-400 mb-6">{message}</p>
        <a
          href="/login"
          className="text-[13px] font-[500]"
          style={{ color: 'var(--color-primary, #f97316)' }}
        >
          Go to login →
        </a>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { TeamClient } from './TeamClient'

export default async function TeamPage() {
  const supabase = createClient()

  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) {
    return <div className="p-6" style={{ color: 'var(--text-primary)' }}>Failed to load team.</div>
  }

  const orgId = result.membership.organizations.id

  const [membersResult, invitesResult] = await Promise.all([
    supabase
      .from('memberships')
      .select('id, role, accepted_at, user_id, profiles(full_name, email, avatar_url)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true }),

    supabase
      .from('invitations')
      .select('id, email, role, expires_at, created_at, profiles(full_name, email)')
      .eq('organization_id', orgId)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  if (membersResult.error) console.error('[team] members query error:', membersResult.error.message)
  if (invitesResult.error) console.error('[team] invites query error:', invitesResult.error.message)

  type RawProfile = { full_name: string | null; email: string; avatar_url: string | null }
  const members = (membersResult.data ?? []).map(m => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return { ...m, profiles: (p as RawProfile | null) ?? null }
  })

  type InviteProfile = { full_name: string | null; email: string } | null
  const invites = (invitesResult.data ?? []).map(inv => {
    const p = Array.isArray(inv.profiles) ? inv.profiles[0] : inv.profiles
    return { ...inv, profiles: (p as InviteProfile) ?? null }
  })

  return (
    <TeamClient
      members={members}
      invites={invites}
      currentUserId={result.profile.id}
      currentRole={result.membership.role}
      orgId={orgId}
    />
  )
}

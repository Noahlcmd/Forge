import { getAppUser } from '@/lib/auth/getAppUser'
import { createClient } from '@/lib/supabase/server'
import { SettingsShell } from './SettingsShell'
import { mergeTheme } from '@/lib/theme'
import type { MemberWithProfile } from '@/types'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
  const supabase = createClient()

  const profile    = result.ok ? result.profile    : null
  const membership = result.ok ? result.membership : null
  const orgId      = result.ok ? result.membership.organizations.id : null

  let members: MemberWithProfile[] = []
  let invitations: { id: string; email: string; role: string; expires_at: string; created_at: string }[] = []

  if (orgId) {
    const [membRes, invRes] = await Promise.all([
      supabase.from('memberships')
        .select('id, role, accepted_at, user_id, profiles(email, full_name, avatar_url)')
        .eq('organization_id', orgId),
      supabase.from('invitations')
        .select('id, email, role, expires_at, created_at')
        .eq('organization_id', orgId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    ])
    members     = (membRes.data ?? []) as unknown as MemberWithProfile[]
    invitations = (invRes.data  ?? []) as typeof invitations
  }

  if (!profile || !membership) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6">
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Not signed in.</p>
      </div>
    )
  }

  const theme = mergeTheme(membership.organizations.theme)

  return (
    <div className="p-6" style={{ color: 'var(--text-primary)' }}>
      <SettingsShell
        profile={profile}
        membership={membership}
        theme={theme}
        members={members}
        invitations={invitations}
        initialTab={searchParams.tab}
      />
    </div>
  )
}

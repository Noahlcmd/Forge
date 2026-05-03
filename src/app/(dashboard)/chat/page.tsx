import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { ChatClient } from './ChatClient'

const DEFAULT_CHANNELS = [
  { name: 'Sales Team',  slug: 'sales-team',  description: 'Sales pipeline, leads, and deals' },
  { name: 'Accounts',    slug: 'accounts',    description: 'Client accounts and billing' },
  { name: 'Management',  slug: 'management',  description: 'Internal management discussion' },
  { name: 'Operations',  slug: 'operations',  description: 'Day-to-day ops coordination' },
]

export default async function ChatPage() {
  const supabase = createClient()

  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) {
    return <div className="p-6" style={{ color: 'var(--text-primary)' }}>Failed to load chat.</div>
  }

  const orgId  = result.membership.organizations.id
  const userId = result.profile.id
  const role   = result.membership.role as string

  // Load channels the user has NOT left, pinned first
  const { data: channels } = await supabase
    .from('chat_channels')
    .select('id, name, slug, description, is_default, is_pinned')
    .eq('organization_id', orgId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: true })

  // Get channels the current user has left
  const { data: leftRows } = await supabase
    .from('channel_memberships')
    .select('channel_id')
    .eq('user_id', userId)
    .not('left_at', 'is', null)

  const leftSet = new Set((leftRows ?? []).map(r => r.channel_id))
  const visibleChannels = (channels ?? []).filter(ch => !leftSet.has(ch.id))

  return (
    <ChatClient
      initialChannels={visibleChannels}
      currentUser={{
        id:        result.profile.id,
        full_name: result.profile.full_name,
        email:     result.profile.email,
      }}
      userRole={role}
      orgId={orgId}
      defaultChannels={DEFAULT_CHANNELS}
    />
  )
}

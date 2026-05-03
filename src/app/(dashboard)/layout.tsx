import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { mergeTheme } from '@/lib/theme'

async function getUnreadCount(orgId: string): Promise<number> {
  try {
    const supabase = createClient()
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('read', false)
    return count ?? 0
  } catch { return 0 }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Single authoritative user/org load — drives both the gate and the UI
  let result: Awaited<ReturnType<typeof getAppUser>>
  try {
    result = await getAppUser()
  } catch {
    redirect('/login')
  }

  if (!result.ok) redirect('/login')

  const org = result.membership.organizations

  // Gate: allow access if org is active OR flagged as a test account
  if (!org.is_active && !org.is_test) {
    redirect('/billing')
  }

  const theme       = mergeTheme(org.theme)
  const unreadCount = await getUnreadCount(org.id)

  const sidebarUser = {
    profile:    result.profile,
    membership: result.membership,
  }

  return (
    <ThemeProvider theme={theme}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar appUser={sidebarUser} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden forge-content">
          <Topbar profile={result.profile} orgName={org.name} unreadCount={unreadCount} />

          <main
            className="flex-1 overflow-y-auto"
            style={{ background: 'var(--content-bg, #f7f8fa)' }}
          >
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}

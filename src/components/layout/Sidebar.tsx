'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { MODULES } from '@/lib/modules'
import type { AppUserProfile, AppUserMembership } from '@/lib/auth/getAppUser'
import {
  LayoutDashboard, Users, Target, UserSearch, Mail, DollarSign,
  Calendar, MessageSquare, Boxes, Briefcase, Bot,
  Wrench, Truck, Settings, CreditCard, LogOut,
  Sparkles, Plus, BarChart2,
  CheckSquare, StickyNote, FolderOpen, Kanban,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SidebarAppUser {
  profile:    Pick<AppUserProfile, 'full_name' | 'email'>
  membership: Pick<AppUserMembership, 'role'> & {
    organizations: Pick<AppUserMembership['organizations'], 'name' | 'logo_url' | 'enabled_modules'>
  }
}

interface SidebarProps {
  appUser: SidebarAppUser | null
}

// ─── Section detection ────────────────────────────────────────────────────────

type Section = 'dashboard' | 'ads' | 'workspace'

function getSection(pathname: string): Section {
  if (pathname.startsWith('/ads'))       return 'ads'
  if (pathname.startsWith('/workspace')) return 'workspace'
  return 'dashboard'
}

// ─── Nav definitions per section ─────────────────────────────────────────────

interface NavItem {
  id:   string
  label: string
  href:  string
  icon:  React.ElementType
  badge?: number
}

interface NavGroup {
  label?: string
  items:  NavItem[]
}

function getDashboardNav(enabled: string[]): NavItem[] {
  const has = (id: string) => enabled.length === 0 || enabled.includes(id)
  const items: NavItem[] = [
    { id: 'dashboard',       label: 'Dashboard',       href: '/dashboard',        icon: LayoutDashboard },
  ]
  if (has('customers'))       items.push({ id: 'customers',       label: 'Customers',       href: '/customers',        icon: Users })
  if (has('leads'))           items.push({ id: 'leads',           label: 'Potential Clients', href: '/leads',          icon: Target })
  if (has('finding-clients')) items.push({ id: 'finding-clients', label: 'Finding Clients',  href: '/finding-clients', icon: UserSearch })
  if (has('outreach'))        items.push({ id: 'outreach',        label: 'Outreach',         href: '/outreach',        icon: Mail })
  if (has('finances'))        items.push({ id: 'finances',        label: 'Finances',         href: '/finances',        icon: DollarSign })
  if (has('calendar'))        items.push({ id: 'calendar',        label: 'Calendar',         href: '/calendar',        icon: Calendar })
  if (has('chat'))            items.push({ id: 'chat',            label: 'Chat',             href: '/chat',            icon: MessageSquare })
                              items.push({ id: 'team',            label: 'Team',             href: '/team',            icon: Users })
                              items.push({ id: 'reports',         label: 'Reports & Insights', href: '/reports',       icon: BarChart2 })
  return items
}

const ADS_NAV: NavGroup[] = [
  {
    label: 'Ads Manager',
    items: [
      { id: 'ads-overview',  label: 'Overview',            href: '/ads',             icon: LayoutDashboard },
      { id: 'ads-builder',   label: 'AI Campaign Builder', href: '/ads/builder',     icon: Sparkles },
      { id: 'ads-reports',   label: 'Campaign Reports',    href: '/ads/reports',     icon: BarChart2 },
      { id: 'ads-audience',  label: 'Audience Builder',    href: '/ads/audience',    icon: Users },
      { id: 'ads-creatives', label: 'Creative Library',    href: '/ads/creatives',   icon: Boxes },
    ],
  },
]

function getWorkspaceNav(enabled: string[]): NavGroup[] {
  const has = (id: string) => enabled.length === 0 || enabled.includes(id)
  const items: NavItem[] = [
    { id: 'workspace', label: 'All Workspaces', href: '/workspace', icon: Boxes },
  ]
  if (has('inventory'))     items.push({ id: 'inventory',     label: 'Inventory Tracker', href: '/workspace/inventory',     icon: Boxes })
  if (has('projects'))      items.push({ id: 'projects',      label: 'Project Manager',   href: '/workspace/projects',      icon: Briefcase })
  if (has('tasks'))         items.push({ id: 'tasks',         label: 'Tasks',             href: '/workspace/tasks',         icon: CheckSquare })
  if (has('notes'))         items.push({ id: 'notes',         label: 'Notes',             href: '/workspace/notes',         icon: StickyNote })
  if (has('ai-assistant'))  items.push({ id: 'ai-assistant',  label: 'AI Assistant',      href: '/workspace/ai-assistant',  icon: Bot })
  if (has('files'))         items.push({ id: 'files',         label: 'Files',             href: '/workspace/files',         icon: FolderOpen })
  if (has('crm-pipelines')) items.push({ id: 'crm-pipelines', label: 'CRM Pipelines',     href: '/workspace/crm-pipelines', icon: Kanban })
  if (has('equipment'))     items.push({ id: 'equipment',     label: 'Equipment',         href: '/workspace/equipment',     icon: Wrench })
  if (has('suppliers'))     items.push({ id: 'suppliers',     label: 'Suppliers',         href: '/workspace/suppliers',     icon: Truck })
  return [{ label: 'Custom Modules', items }]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavLink({
  item,
  isActive,
}: {
  item: NavItem
  isActive: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      style={isActive ? { background: 'var(--sidebar-active)', color: '#ffffff' } : {}}
      className={[
        'group relative flex items-center gap-2.5 px-3 py-[7px] mx-2 rounded-[6px] text-[13px] font-[400] cursor-pointer select-none transition-colors duration-100',
        isActive
          ? 'text-white'
          : 'text-[#9499a5] hover:bg-[#1e2128] hover:text-[#c4c8d4]',
      ].join(' ')}
    >
      {isActive && (
        <span
          className="absolute -left-2 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-[2px]"
          style={{ background: 'var(--color-primary)' }}
        />
      )}
      <Icon
        className="w-4 h-4 shrink-0"
        style={isActive ? { opacity: 1 } : { opacity: 0.7 }}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span
          className="text-[10px] font-[600] px-[7px] py-[2px] rounded-[20px] leading-[1.4]"
          style={{ background: '#2a3060', color: '#7b8cff' }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  )
}

function NavGroupSection({
  group,
  pathname,
}: {
  group: NavGroup
  pathname: string
}) {
  return (
    <div>
      {group.label && (
        <p className="text-[10px] font-[600] text-[#4b5263] tracking-[0.08em] uppercase px-4 pt-3 pb-1 mt-1">
          {group.label}
        </p>
      )}
      {group.items.map(item => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : item.href === '/ads'
              ? pathname === '/ads'
              : pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <NavLink key={item.id} item={item} isActive={isActive} />
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Sidebar({ appUser }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()

  const displayName = appUser?.profile?.full_name ?? appUser?.profile?.email ?? 'Loading…'
  const email       = appUser?.profile?.email ?? ''
  const orgName     = appUser?.membership?.organizations?.name ?? 'Forge'
  const logoUrl     = appUser?.membership?.organizations?.logo_url ?? null
  const role        = appUser?.membership?.role ?? 'employee'
  const enabled     = appUser?.membership?.organizations?.enabled_modules ?? []

  const initials = (displayName || 'U')
    .split(' ')
    .map((n: string) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  const section = getSection(pathname)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }

  // Build nav based on section
  const dashboardItems = getDashboardNav(enabled)
  const workspaceGroups = getWorkspaceNav(enabled)

  const ROLE_LABEL: Record<string, string> = {
    owner: 'Owner', admin: 'Admin', employee: 'Member',
  }

  return (
    <aside
      className="flex flex-col h-screen shrink-0 overflow-hidden"
      style={{
        width: 228,
        minWidth: 228,
        background: 'var(--sidebar-bg, #111318)',
        borderRight: '1px solid var(--sidebar-border, #1e2128)',
      }}
    >
      {/* ── Brand ────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-4 py-[18px]"
        style={{ borderBottom: '1px solid #1a1d24' }}
      >
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={orgName}
            width={28}
            height={28}
            className="rounded-[7px] object-cover shrink-0"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 text-[13px] font-[600] text-white"
            style={{ background: 'var(--color-primary, #f97316)' }}
          >
            {orgName[0]?.toUpperCase() ?? 'F'}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-[600] text-white tracking-[-0.3px] truncate leading-none">
            {orgName}
          </p>
          <p className="text-[10px] text-[#9499a5] mt-[1px]">Business Platform</p>
        </div>
      </div>

      {/* ── Section switcher ─────────────────────────────────────────────── */}
      <div
        className="flex gap-0.5 p-[10px]"
        style={{ borderBottom: '1px solid #1a1d24' }}
      >
        {(
          [
            { id: 'dashboard' as const, label: 'Dashboard', href: '/dashboard' },
            { id: 'ads'       as const, label: 'Ads',       href: '/ads'       },
            { id: 'workspace' as const, label: 'Workspace', href: '/workspace' },
          ] as const
        ).map(s => (
          <Link
            key={s.id}
            href={s.href}
            className="flex-1 text-center text-[10px] font-[500] px-1 py-[6px] rounded-[6px] transition-all duration-150 leading-[1.3] cursor-pointer"
            style={
              section === s.id
                ? { background: 'var(--sidebar-active, #252932)', color: '#ffffff' }
                : { color: 'var(--sidebar-text, #9499a5)' }
            }
            onMouseEnter={e => {
              if (section !== s.id) {
                (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover, #1e2128)'
                ;(e.currentTarget as HTMLElement).style.color = '#c4c8d4'
              }
            }}
            onMouseLeave={e => {
              if (section !== s.id) {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text, #9499a5)'
              }
            }}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* ── Nav items ────────────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto py-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {section === 'dashboard' && (
          <NavGroupSection
            group={{ items: dashboardItems }}
            pathname={pathname}
          />
        )}

        {section === 'ads' && ADS_NAV.map((g, i) => (
          <NavGroupSection key={i} group={g} pathname={pathname} />
        ))}

        {section === 'workspace' && (
          <>
            {workspaceGroups.map((g, i) => (
              <NavGroupSection key={i} group={g} pathname={pathname} />
            ))}
            <div className="px-3 pt-3">
              <Link
                href="/settings?tab=modules"
                className="flex items-center justify-center gap-1.5 w-full py-[6px] text-[12px] font-[500] rounded-[6px] border transition-colors"
                style={{
                  color: 'var(--sidebar-text)',
                  borderColor: 'var(--sidebar-border)',
                  background: 'transparent',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                New Module
              </Link>
            </div>
          </>
        )}

        {/* Settings + Billing (always visible, at bottom of nav) */}
        {section === 'dashboard' && (
          <div className="pt-3">
            {([
              { id: 'settings', label: 'Settings', href: '/settings', Icon: Settings },
              { id: 'billing',  label: 'Billing',  href: '/billing',  Icon: CreditCard },
            ] as const).map(({ id, label, href, Icon }) => {
              const isActive = pathname.startsWith('/' + id)
              return (
                <Link
                  key={id}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-[7px] mx-2 rounded-[6px] text-[13px] transition-colors"
                  style={
                    isActive
                      ? { background: 'var(--sidebar-active)', color: '#ffffff' }
                      : { color: 'var(--sidebar-text)' }
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ opacity: 0.7 }} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* ── User footer ──────────────────────────────────────────────────── */}
      <div className="p-3 shrink-0" style={{ borderTop: '1px solid #1a1d24' }}>
        <div
          className="flex items-center gap-2.5 p-2 rounded-[10px] cursor-pointer transition-colors hover:bg-[#1e2128]"
        >
          <div
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 text-[11px] font-[600] text-white"
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-[#c4c8d4] font-[500] truncate leading-none">
              {displayName}
            </p>
            <p className="text-[11px] text-[#636878] mt-[2px] truncate">
              {ROLE_LABEL[role] ?? role} · {orgName}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[#636878] hover:text-red-400 transition-colors p-1 rounded"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

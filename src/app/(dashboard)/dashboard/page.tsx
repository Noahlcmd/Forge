import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { getDemoMode } from '@/lib/demo'
import { OnboardingModal } from './OnboardingModal'
import { DemoToggle } from './DemoToggle'
import {
  Users, Target, Mail, DollarSign, TrendingUp, Activity,
  ArrowRight, Clock, Plus, Megaphone, Calendar,
  CheckCircle2, UserSearch, Sparkles, Receipt, ChevronRight,
  Zap, BarChart3, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type QuickAction = {
  label: string; desc: string; href: string
  icon: LucideIcon; color: string; bg: string
}
type KPIStat = {
  id: string; label: string; value: number | null
  icon: LucideIcon; iconColor: string; iconBg: string; href: string
  emptyLabel: string
}
type ActivityItem = {
  id: string; label: string; sub: string; time: string
  icon: LucideIcon; color: string; bg: string
}
type FollowLead = { id: string; name: string | null; company: string | null; stage: string }
type RecentCust = { id: string; name: string; company: string | null; status: string; created_at: string }
type RecentLead = { id: string; name: string | null; company: string | null; source: string | null; stage: string; created_at: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const FOLLOW_UP_STAGES = ['follow_up_1', 'follow_up_2', 'follow_up_3']

const STAGE_LABELS: Record<string, string> = {
  not_contacted:    'Not contacted',
  first_email_sent: 'Email sent',
  follow_up_1:      'Follow-up 1',
  follow_up_2:      'Follow-up 2',
  follow_up_3:      'Follow-up 3',
  replied:          'Replied',
  meeting_booked:   'Meeting booked',
  proposal_sent:    'Proposal sent',
  won:              'Won',
  lost:             'Lost',
}

const ROLE_LABELS: Record<string, string> = {
  owner:    'Owner',
  admin:    'Administrator',
  employee: 'Team Member',
}

const BUSINESS_LABELS: Record<string, string> = {
  agency:     'Agency',
  freelancer: 'Freelancer',
  startup:    'Startup',
  ecommerce:  'E-commerce',
  consulting: 'Consulting',
  accounting: 'Accounting',
}

const QUICK_ACTIONS_BY_TYPE: Record<string, QuickAction[]> = {
  agency: [
    { label: 'Start Outreach',  desc: 'Create email sequences',  href: '/outreach',        icon: Mail,       color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Find Leads',      desc: 'Discover new prospects',  href: '/finding-clients', icon: UserSearch, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Add Customer',    desc: 'Track a client account',  href: '/customers',       icon: Users,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'AI Campaign',     desc: 'Generate ad campaigns',   href: '/ads',             icon: Megaphone,  color: 'text-pink-600',   bg: 'bg-pink-50'   },
  ],
  ecommerce: [
    { label: 'Run Ad',          desc: 'AI-powered campaigns',    href: '/ads',                 icon: Megaphone,  color: 'text-pink-600',   bg: 'bg-pink-50'   },
    { label: 'View Finances',   desc: 'Revenue tracking',        href: '/finances',            icon: DollarSign, color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Customers',       desc: 'Manage your buyers',      href: '/customers',           icon: Users,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Inventory',       desc: 'Check stock levels',      href: '/workspace/inventory', icon: Target,     color: 'text-amber-600',  bg: 'bg-amber-50'  },
  ],
  accounting: [
    { label: 'Add Client',      desc: 'New client record',       href: '/customers',  icon: Users,      color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'Finances',        desc: 'Income and tax tracking', href: '/finances',   icon: DollarSign, color: 'text-green-600',   bg: 'bg-green-50'   },
    { label: 'Schedule',        desc: 'Book client appointments',href: '/calendar',   icon: Calendar,   color: 'text-cyan-600',    bg: 'bg-cyan-50'    },
    { label: 'Invoices',        desc: 'Create and send bills',   href: '/finances',   icon: Receipt,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ],
  freelancer: [
    { label: 'Add Customer',    desc: 'New client account',      href: '/customers',       icon: Users,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Finances',        desc: 'Track your income',       href: '/finances',        icon: Receipt,    color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Find Leads',      desc: 'New opportunities',       href: '/finding-clients', icon: UserSearch, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Calendar',        desc: 'Schedule client calls',   href: '/calendar',        icon: Calendar,   color: 'text-cyan-600',   bg: 'bg-cyan-50'   },
  ],
  startup: [
    { label: 'Find Leads',      desc: 'Grow your pipeline',      href: '/finding-clients', icon: UserSearch, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'AI Campaign',     desc: 'Launch ads in minutes',   href: '/ads',             icon: Megaphone,  color: 'text-pink-600',   bg: 'bg-pink-50'   },
    { label: 'Add Customer',    desc: 'Track your users',        href: '/customers',       icon: Users,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Revenue',         desc: 'Track growth metrics',    href: '/finances',        icon: TrendingUp, color: 'text-green-600',  bg: 'bg-green-50'  },
  ],
  consulting: [
    { label: 'Add Client',      desc: 'New engagement',          href: '/customers',       icon: Users,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Schedule',        desc: 'Book consultation',       href: '/calendar',        icon: Calendar,   color: 'text-cyan-600',   bg: 'bg-cyan-50'   },
    { label: 'Find Leads',      desc: 'Prospect outreach',       href: '/finding-clients', icon: UserSearch, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Finances',        desc: 'Track project fees',      href: '/finances',        icon: DollarSign, color: 'text-green-600',  bg: 'bg-green-50'  },
  ],
}
QUICK_ACTIONS_BY_TYPE.other = QUICK_ACTIONS_BY_TYPE.consulting

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function sparklinePath(values: number[]): string {
  if (values.length < 2) return ''
  const w = 200; const h = 60; const pad = 4
  const min = Math.min(...values); const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return `M ${pts.join(' L ')}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`forge-card relative ${className}`}
      style={{ padding: 20, ...style }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {action}
    </div>
  )
}

function KpiChange({ up, label }: { up?: boolean | null; label: string }) {
  if (up === true) return (
    <span className="inline-flex items-center gap-1 text-[11px] font-[500] px-[7px] py-[2px] rounded-[20px] mt-1.5 bg-[#e8f7ee] text-[#12a150]">
      <ArrowUpRight className="w-3 h-3" />{label}
    </span>
  )
  if (up === false) return (
    <span className="inline-flex items-center gap-1 text-[11px] font-[500] px-[7px] py-[2px] rounded-[20px] mt-1.5 bg-[#fff0f0] text-[#e53e3e]">
      <ArrowDownRight className="w-3 h-3" />{label}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-[500] px-[7px] py-[2px] rounded-[20px] mt-1.5 bg-[#f3f4f6] text-[#6b7280]">
      <Minus className="w-3 h-3" />{label}
    </span>
  )
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_CUSTOMERS: RecentCust[] = [
  { id: 'd1', name: 'Acme Corp',       company: 'Acme Corp',        status: 'active',   created_at: new Date(Date.now() - 3_600_000).toISOString() },
  { id: 'd2', name: 'BlueSky Media',   company: 'BlueSky Media',    status: 'active',   created_at: new Date(Date.now() - 7_200_000).toISOString() },
  { id: 'd3', name: 'NovaTech Ltd',    company: 'NovaTech Ltd',     status: 'paused',   created_at: new Date(Date.now() - 86_400_000).toISOString() },
  { id: 'd4', name: 'Greenleaf Co.',   company: 'Greenleaf Co.',    status: 'active',   created_at: new Date(Date.now() - 172_800_000).toISOString() },
  { id: 'd5', name: 'Vertex Digital',  company: 'Vertex Digital',   status: 'active',   created_at: new Date(Date.now() - 259_200_000).toISOString() },
]

const DEMO_LEADS: RecentLead[] = [
  { id: 'dl1', name: 'TechVentures', company: 'TechVentures Inc',   source: 'LinkedIn', stage: 'replied',          created_at: new Date(Date.now() - 1_800_000).toISOString() },
  { id: 'dl2', name: 'FinEdge',      company: 'FinEdge Solutions',  source: 'Apollo',   stage: 'proposal_sent',    created_at: new Date(Date.now() - 5_400_000).toISOString() },
  { id: 'dl3', name: 'GrowthKit',    company: 'GrowthKit',          source: 'Website',  stage: 'meeting_booked',   created_at: new Date(Date.now() - 43_200_000).toISOString() },
  { id: 'dl4', name: 'SkyFlow AI',   company: 'SkyFlow AI',         source: 'Referral', stage: 'first_email_sent', created_at: new Date(Date.now() - 86_400_000).toISOString() },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const isDemo = getDemoMode()
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
  const supabase = createClient()

  const profile    = result.ok ? result.profile    : null
  const membership = result.ok ? result.membership : null
  const org        = membership?.organizations
  const orgId      = org?.id ?? null

  const businessType   = org?.business_type  ?? 'other'
  const enabledModules = org?.enabled_modules ?? []
  const hasModule = (id: string) => enabledModules.length === 0 || enabledModules.includes(id)
  const needsOnboarding = !org?.onboarding_completed && membership?.role === 'owner'

  // ── DB queries (gated by module + orgId) ─────────────────────────────────
  let customerCount = 0
  let leadCount     = 0
  let seqCount      = 0
  let followUps:  FollowLead[]  = []
  let customers:  RecentCust[]  = []
  let leads:      RecentLead[]  = []

  if (orgId) {
    const tasks = await Promise.all([
      hasModule('customers')
        ? supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
        : null,
      hasModule('leads')
        ? supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
        : null,
      hasModule('outreach')
        ? supabase.from('outreach').select('*', { count: 'exact', head: true }).eq('organization_id', orgId)
        : null,
      hasModule('leads')
        ? supabase.from('leads')
            .select('id, name, company, stage')
            .eq('organization_id', orgId)
            .in('stage', FOLLOW_UP_STAGES)
            .order('updated_at', { ascending: true })
            .limit(5)
        : null,
      hasModule('customers')
        ? supabase.from('customers')
            .select('id, name, company, status, created_at')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(6)
        : null,
      hasModule('leads')
        ? supabase.from('leads')
            .select('id, name, company, source, stage, created_at')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(6)
        : null,
    ])

    customerCount = tasks[0]?.count  ?? 0
    leadCount     = tasks[1]?.count  ?? 0
    seqCount      = tasks[2]?.count  ?? 0
    followUps     = (tasks[3]?.data  ?? []) as FollowLead[]
    customers     = (tasks[4]?.data  ?? []) as RecentCust[]
    leads         = (tasks[5]?.data  ?? []) as RecentLead[]
  }

  // Override with demo data when demo mode is active
  if (isDemo) {
    customerCount = 124
    leadCount     = 47
    seqCount      = 8
    customers     = DEMO_CUSTOMERS
    leads         = DEMO_LEADS
    followUps     = [
      { id: 'df1', name: 'TechVentures Inc', company: 'TechVentures', stage: 'follow_up_2' },
      { id: 'df2', name: 'SkyFlow AI',       company: 'SkyFlow AI',   stage: 'follow_up_1' },
    ]
  }

  // ── Activity feed ─────────────────────────────────────────────────────────
  const activity: ActivityItem[] = [
    ...customers.map(c => ({
      id:    `c-${c.id}`,
      label: c.name,
      sub:   c.company ?? 'New client added',
      time:  relTime(c.created_at),
      icon:  Users,
      color: 'text-blue-600',
      bg:    'bg-blue-50',
      ts:    c.created_at,
    })),
    ...leads.map(l => ({
      id:    `l-${l.id}`,
      label: l.name ?? l.company ?? 'Unknown',
      sub:   STAGE_LABELS[l.stage] ?? l.stage,
      time:  relTime(l.created_at),
      icon:  Target,
      color: 'text-purple-600',
      bg:    'bg-purple-50',
      ts:    l.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 7)

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const kpiStats: KPIStat[] = [
    hasModule('customers') && {
      id: 'customers', label: 'Active Customers', value: customerCount,
      icon: Users, iconColor: 'text-blue-600', iconBg: 'bg-blue-50',
      href: '/customers', emptyLabel: 'Add first client →',
    },
    hasModule('leads') && {
      id: 'leads', label: 'Leads in Pipeline', value: leadCount,
      icon: Target, iconColor: 'text-purple-600', iconBg: 'bg-purple-50',
      href: '/leads', emptyLabel: 'Start pipeline →',
    },
    hasModule('outreach') && {
      id: 'outreach', label: 'Active Sequences', value: seqCount,
      icon: Mail, iconColor: 'text-orange-600', iconBg: 'bg-orange-50',
      href: '/outreach', emptyLabel: 'Create sequence →',
    },
    {
      id: 'revenue', label: 'Monthly Revenue', value: null,
      icon: TrendingUp, iconColor: 'text-green-600', iconBg: 'bg-green-50',
      href: '/finances', emptyLabel: 'Connect finances →',
    },
  ].filter(Boolean).slice(0, 4) as KPIStat[]

  // ── Quick actions ─────────────────────────────────────────────────────────
  const rawActions = QUICK_ACTIONS_BY_TYPE[businessType] ?? QUICK_ACTIONS_BY_TYPE.other
  const quickActions = enabledModules.length === 0
    ? rawActions
    : rawActions.filter(a => {
        if (a.href === '/outreach'           && !hasModule('outreach'))        return false
        if (a.href === '/finding-clients'    && !hasModule('finding-clients')) return false
        if (a.href === '/customers'          && !hasModule('customers'))       return false
        if (a.href === '/ads'               && !hasModule('ads'))             return false
        if (a.href === '/finances'           && !hasModule('finances'))        return false
        if (a.href === '/calendar'           && !hasModule('calendar'))        return false
        if (a.href.startsWith('/workspace/') && !hasModule(a.href.split('/workspace/')[1])) return false
        return true
      })

  // ── Sparkline (placeholder until real finance data) ───────────────────────
  const sparkValues = [38, 52, 41, 67, 58, 74, 89, 76, 84, 91, 78, 95]
  const linePath    = sparklinePath(sparkValues)
  const areaPath    = linePath ? `${linePath} L 196,56 L 4,56 Z` : ''

  // ── Derived display values ────────────────────────────────────────────────
  const firstName  = ((profile?.full_name ?? profile?.email) || 'there').split(/[\s@]/)[0] ?? 'there'
  const orgName    = org?.name ?? 'Your workspace'
  const role       = membership?.role ?? 'owner'
  const subStatus  = org?.subscription_status ?? 'inactive'
  const isActive   = subStatus === 'active'
  const isTrial    = subStatus === 'trialing'
  const showAdsCta = hasModule('ads') && customerCount === 0 && leadCount === 0

  // Day greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      {needsOnboarding && orgId && (
        <OnboardingModal orgId={orgId} orgName={orgName} />
      )}

      <div className="p-6 space-y-5 min-h-full" style={{ color: 'var(--text-primary)' }}>

        {/* ── Demo banner ──────────────────────────────────────────────────── */}
        {isDemo && (
          <div
            className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-[10px]"
            style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}
          >
            <p className="text-[13px] font-[500]" style={{ color: '#92400e' }}>
              👀 You&apos;re viewing demo data — this is not your real account data.
            </p>
          </div>
        )}

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
              {today} · {orgName}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-[500] px-2.5 py-[3px] rounded-[20px]"
              style={
                isActive
                  ? { background: '#e8f7ee', color: '#12a150' }
                  : isTrial
                    ? { background: '#eff6ff', color: '#2563eb' }
                    : { background: '#f3f4f6', color: '#6b7280' }
              }
            >
              <span
                className="w-[6px] h-[6px] rounded-full"
                style={{ background: isActive ? '#12a150' : isTrial ? '#2563eb' : '#9ca3af' }}
              />
              {isActive ? 'Active' : isTrial ? 'Trial' : 'Inactive'}
            </span>
            <span
              className="text-[11px] font-[500] px-2.5 py-[3px] rounded-[20px]"
              style={{ background: '#f3f4f6', color: '#6b7280' }}
            >
              {ROLE_LABELS[role] ?? role}
            </span>
            {BUSINESS_LABELS[businessType] && (
              <span
                className="text-[11px] font-[500] px-2.5 py-[3px] rounded-[20px]"
                style={{ background: '#eef0ff', color: '#4f5fd4' }}
              >
                {BUSINESS_LABELS[businessType]}
              </span>
            )}
            <DemoToggle isDemo={isDemo} />
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[13px] font-[500] rounded-[10px] transition-all"
              style={{ background: 'var(--color-primary, #f97316)', color: '#fff' }}
            >
              <Zap className="w-3.5 h-3.5" />
              Workspace
            </Link>
          </div>
        </div>

        {/* ── KPI grid ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
          {kpiStats.map(({ id, label, value, icon: Icon, iconColor, iconBg, href, emptyLabel }) => (
            <Link key={id} href={href} className="block group">
              <Card className="hover:border-[#d0d5e0] transition-all hover:shadow-md cursor-pointer">
                <p
                  className="text-[11px] font-[500] uppercase tracking-[0.06em] mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {label}
                </p>
                <p
                  className="text-[26px] font-[600] tracking-[-0.8px] leading-none"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {value !== null ? value.toLocaleString() : '—'}
                </p>
                <KpiChange
                  up={value === null ? null : value === 0 ? null : true}
                  label={value === 0 || value === null ? emptyLabel : `${value} total`}
                />
                <div
                  className={`absolute top-4 right-4 w-9 h-9 rounded-[10px] flex items-center justify-center ${iconBg}`}
                >
                  <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* ── Main grid: chart + follow-ups ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[14px]">

          {/* Revenue chart — 2/3 width */}
          <Card className="lg:col-span-2" style={{ padding: 20 }}>
            <div className="flex items-start justify-between mb-1 flex-wrap gap-2">
              <div>
                <h3 className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                  Revenue Overview
                </h3>
                <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  {hasModule('finances')
                    ? 'Connect Stripe in Settings → Integrations to populate'
                    : 'Sample data only — connect finances in Settings to see real numbers'}
                </p>
              </div>
              <div className="flex gap-1">
                {/* Time-range selector — active once real finance data is connected */}
                {['Monthly', 'Weekly', 'Yearly'].map((t, i) => (
                  <span
                    key={t}
                    className="px-3 py-[5px] text-[12px] border rounded-[6px] select-none"
                    style={
                      i === 0
                        ? { background: '#eef0ff', color: '#4f5fd4', borderColor: 'transparent' }
                        : { background: '#fff', color: 'var(--text-muted)', borderColor: 'var(--card-border)', opacity: 0.5 }
                    }
                    title="Connect finances to enable time-range filtering"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Bar chart (12-month view) */}
            <div className="mt-4">
              <div className="flex items-end gap-[6px] h-[120px]">
                {sparkValues.map((v, i) => {
                  const heightPct = (v / Math.max(...sparkValues)) * 100
                  const isPast    = i < 4
                  const isCurrent = i === 4 || i === 5 || i === 6
                  return (
                    <div
                      key={i}
                      className="flex-1 min-w-0 rounded-t-[4px] cursor-pointer transition-all hover:brightness-90"
                      style={{
                        height: `${heightPct}%`,
                        background: isPast ? '#e8ebff' : isCurrent
                          ? 'var(--color-primary, #f97316)'
                          : '#fef3c7',
                      }}
                      title={`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}`}
                    />
                  )
                })}
              </div>
              <div className="flex gap-[6px] mt-1.5">
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                  <div
                    key={m}
                    className="flex-1 text-center text-[10px] truncate overflow-hidden"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-2.5 h-2.5 rounded-[2px] inline-block" style={{ background: 'var(--color-primary)' }} />
                Revenue
              </div>
              <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-2.5 h-2.5 rounded-[2px] inline-block border" style={{ background: '#fef3c7', borderColor: '#d97706' }} />
                Expenses
              </div>
              <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-2.5 h-2.5 rounded-[2px] inline-block" style={{ background: '#e8ebff' }} />
                Prior months
              </div>
              {!hasModule('finances') && (
                <Link
                  href="/settings"
                  className="ml-auto flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-[8px] transition-all"
                  style={{ background: '#eef0ff', color: '#4f5fd4' }}
                >
                  <Zap className="w-3 h-3" />
                  Enable Finances
                </Link>
              )}
            </div>
          </Card>

          {/* Follow-ups — 1/3 width */}
          <Card style={{ padding: 20 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                Follow-ups Due
              </h3>
              {followUps.length > 0 && (
                <span
                  className="text-[11px] font-[600] px-2 py-[2px] rounded-[20px]"
                  style={{ background: '#fff0f0', color: '#e53e3e' }}
                >
                  {followUps.length}
                </span>
              )}
            </div>

            {followUps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 gap-3 text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#f3f4f6' }}
                >
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#9ca3af' }} />
                </div>
                <div>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    No follow-ups pending
                  </p>
                  <Link
                    href="/leads"
                    className="text-[12px] mt-1 inline-flex items-center gap-1 hover:underline"
                    style={{ color: 'var(--color-primary, #f97316)' }}
                  >
                    View pipeline <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {followUps.map(lead => (
                  <Link
                    key={lead.id}
                    href="/leads"
                    className="flex items-center gap-2.5 p-2.5 rounded-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5 group"
                  >
                    <div
                      className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 text-[10px] font-[700] text-white"
                      style={{ background: 'var(--color-primary, #f97316)' }}
                    >
                      {(lead.name ?? lead.company ?? '?')[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-[500] truncate" style={{ color: 'var(--text-primary)' }}>
                        {lead.name ?? lead.company}
                      </p>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {STAGE_LABELS[lead.stage] ?? lead.stage}
                      </p>
                    </div>
                    <ArrowRight className="w-3 h-3 shrink-0 opacity-30 group-hover:opacity-70 transition-opacity" />
                  </Link>
                ))}
                <Link
                  href="/leads"
                  className="flex items-center justify-center gap-1 text-[12px] pt-2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  View all leads <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </Card>
        </div>

        {/* ── Activity + Quick Actions ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">

          {/* Activity feed */}
          <Card>
            <SectionHeader
              title="Recent Customer Activity"
              action={
                <Link href="/customers" className="btn btn-secondary btn-sm text-[12px]">
                  View All
                </Link>
              }
            />

            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3 text-center">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#f3f4f6' }}
                >
                  <BarChart3 className="w-5 h-5" style={{ color: '#9ca3af' }} />
                </div>
                <div>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No activity yet</p>
                  <Link
                    href="/customers"
                    className="text-[12px] mt-1 inline-block hover:underline"
                    style={{ color: 'var(--color-primary, #f97316)' }}
                  >
                    Add your first customer →
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                {activity.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-[10px] border-b last:border-0"
                    style={{ borderColor: 'var(--card-border)' }}
                  >
                    <div
                      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 ${item.bg}`}
                    >
                      <item.icon className={`w-[13px] h-[13px] ${item.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                        <strong>{item.label}</strong>
                        {' · '}
                        <span style={{ color: 'var(--text-muted)' }}>{item.sub}</span>
                      </p>
                      <p className="text-[11px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* New Leads Added */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                New Leads Added
              </h3>
              {leadCount > 0 && (
                <span className="chip chip-purple">{leadCount} total</span>
              )}
            </div>

            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 gap-2 text-center">
                <Target className="w-6 h-6" style={{ color: '#d0d5e0' }} />
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No leads yet</p>
                <Link
                  href="/leads"
                  className="text-[12px] hover:underline"
                  style={{ color: 'var(--color-primary, #f97316)' }}
                >
                  Start pipeline →
                </Link>
              </div>
            ) : (
              <>
                <div>
                  {leads.map(l => (
                    <div
                      key={l.id}
                      className="flex items-center gap-3 py-[10px] border-b last:border-0"
                      style={{ borderColor: 'var(--card-border)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>
                          <strong>{l.name ?? l.company}</strong>
                          {l.name && l.company ? ` · ${l.company}` : ''}
                        </p>
                        <p className="text-[11px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
                          {l.source ? `Added via ${l.source}` : STAGE_LABELS[l.stage] ?? l.stage}
                        </p>
                      </div>
                      <span className="chip chip-blue">{STAGE_LABELS[l.stage] ?? l.stage}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Link
                    href="/customers"
                    className="inline-flex items-center gap-1 px-3 py-2 text-[12px] font-[500] rounded-[8px] border transition-colors"
                    style={{ background: '#eef0ff', color: '#4f5fd4', borderColor: 'transparent' }}
                  >
                    <Plus className="w-3 h-3" />Add Customer
                  </Link>
                  <Link
                    href="/outreach"
                    className="inline-flex items-center gap-1 px-3 py-2 text-[12px] font-[500] rounded-[8px] border transition-colors"
                    style={{ background: '#eef0ff', color: '#4f5fd4', borderColor: 'transparent' }}
                  >
                    <Mail className="w-3 h-3" />Outreach
                  </Link>
                  {hasModule('finances') && (
                    <Link
                      href="/finances"
                      className="inline-flex items-center gap-1 px-3 py-2 text-[12px] font-[500] rounded-[8px] border transition-colors"
                      style={{ background: '#eef0ff', color: '#4f5fd4', borderColor: 'transparent' }}
                    >
                      <Receipt className="w-3 h-3" />New Invoice
                    </Link>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <Card>
          <SectionHeader title="Quick Actions" action={<Sparkles className="w-4 h-4" style={{ color: '#9ca3af' }} />} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.slice(0, 4).map(({ label, desc, href, icon: Icon, color, bg }) => (
              <Link
                key={`${href}-${label}`}
                href={href}
                className="group flex flex-col gap-3 p-4 rounded-[10px] border transition-all hover:border-[#c0c8ff] hover:shadow-sm"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${bg}`}>
                  <Icon className={`w-[18px] h-[18px] ${color}`} />
                </div>
                <div>
                  <p className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                    {label}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* ── Ads CTA ───────────────────────────────────────────────────────── */}
        {showAdsCta && (
          <div
            className="flex items-center gap-4 p-5 rounded-[14px] border"
            style={{
              background: 'linear-gradient(135deg, #fff7f0 0%, #fff 100%)',
              borderColor: '#fdd5b0',
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#fef3e8' }}
            >
              <Megaphone className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                Ready to attract customers?
              </p>
              <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Use the AI Campaign Builder to generate high-converting ads in 30 seconds.
              </p>
            </div>
            <Link
              href="/ads"
              className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-[500] text-white transition-colors shrink-0"
              style={{ background: 'var(--color-primary, #f97316)' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Launch
            </Link>
          </div>
        )}

      </div>
    </>
  )
}

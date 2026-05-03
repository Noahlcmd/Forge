import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { getDemoMode } from '@/lib/demo'
import { formatMoney } from '@/lib/currency'
import Link from 'next/link'
import { Sparkles, BarChart2, TrendingUp, Target, DollarSign } from 'lucide-react'

const DEMO_CAMPAIGNS = [
  { id: '1', name: 'Brand Awareness — Q2', platform: 'facebook',  status: 'active',    budget_cents: 150000, spent_cents: 87400,  ad_copy: null, created_at: '' },
  { id: '2', name: 'Lead Gen — Spring',    platform: 'google',    status: 'active',    budget_cents: 200000, spent_cents: 134200, ad_copy: null, created_at: '' },
  { id: '3', name: 'Retargeting Aug',      platform: 'instagram', status: 'paused',    budget_cents: 80000,  spent_cents: 61000,  ad_copy: null, created_at: '' },
  { id: '4', name: 'LinkedIn Outreach',    platform: 'linkedin',  status: 'completed', budget_cents: 50000,  spent_cents: 49800,  ad_copy: null, created_at: '' },
]

export default async function AdsOverviewPage() {
  const supabase = createClient()
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
  const orgId    = result.ok ? result.membership.organizations.id : null
  const currency = result.ok ? ((result.membership.organizations.settings?.currency as string | undefined) ?? 'USD') : 'USD'
  const isDemo   = getDemoMode()

  let campaigns: {
    id: string; name: string; platform: string | null
    status: string; budget_cents: number; spent_cents: number
    ad_copy: string | null; created_at: string
  }[] = []

  if (isDemo) {
    campaigns = DEMO_CAMPAIGNS
  } else if (orgId) {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, platform, status, budget_cents, spent_cents, ad_copy, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20)
    campaigns = data ?? []
  }

  const totalSpend  = campaigns.reduce((s, c) => s + c.spent_cents,  0)
  const totalBudget = campaigns.reduce((s, c) => s + c.budget_cents, 0)
  const active      = campaigns.filter(c => c.status === 'active').length

  const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
    active:    { bg: '#e8f7ee', color: '#12a150' },
    paused:    { bg: '#fffbeb', color: '#d97706' },
    draft:     { bg: '#f3f4f6', color: '#6b7280' },
    completed: { bg: '#eff6ff', color: '#2563eb' },
  }

  const PLATFORM_CHIP: Record<string, { bg: string; color: string }> = {
    facebook:  { bg: '#eff6ff', color: '#1877f2' },
    google:    { bg: '#fef9c3', color: '#ea580c' },
    linkedin:  { bg: '#e0f2fe', color: '#0a66c2' },
    instagram: { bg: '#fdf2f8', color: '#be185d' },
    tiktok:    { bg: '#f3f4f6', color: '#111827' },
  }

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]">Ads Manager</h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            All platforms · overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings?tab=integrations"
            className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[13px] font-[500] rounded-[10px] border transition-all"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)', background: 'var(--card-bg)' }}
          >
            Connect Account
          </Link>
          <Link
            href="/ads/builder"
            className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[10px] text-[13px] font-[500] text-white"
            style={{ background: 'var(--color-primary, #f97316)' }}
          >
            <Sparkles className="w-4 h-4" />
            AI Campaign Builder
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Spend',    value: formatMoney(totalSpend,  currency, { decimals: false }), icon: <DollarSign className="w-[18px] h-[18px] text-red-500" />,    bg: 'bg-red-50' },
          { label: 'Total Budget',   value: formatMoney(totalBudget, currency, { decimals: false }), icon: <Target     className="w-[18px] h-[18px] text-blue-600" />,   bg: 'bg-blue-50' },
          { label: 'Active Campaigns', value: String(active),                           icon: <TrendingUp className="w-[18px] h-[18px] text-green-600" />,  bg: 'bg-green-50' },
          { label: 'Total Campaigns', value: String(campaigns.length),                 icon: <BarChart2  className="w-[18px] h-[18px]" style={{ color: 'var(--color-primary, #f97316)' }} />, bg: '' },
        ].map(kpi => (
          <div key={kpi.label} className="forge-card" style={{ padding: 20 }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-[500] uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                <p className="text-[26px] font-[600] tracking-[-0.8px] leading-none" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${kpi.bg}`} style={!kpi.bg ? { background: '#fff3e8' } : {}}>
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform badges */}
      <div>
        <p className="text-[14px] font-[600] mb-3">Connected Platforms</p>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Meta / Facebook', color: '#1877f2', badge: 'f',  status: 'disconnected' },
            { label: 'Google Ads',      color: '#4285f4', badge: 'G',  status: 'disconnected' },
            { label: 'LinkedIn Ads',    color: '#0a66c2', badge: 'in', status: 'disconnected' },
            { label: 'TikTok Ads',      color: '#111827', badge: '♪',  status: 'disconnected' },
          ].map(p => (
            <div
              key={p.label}
              className="forge-card flex items-center gap-3"
              style={{ padding: '12px 16px', flexShrink: 0 }}
            >
              <div
                className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center text-white font-[700] shrink-0"
                style={{ background: p.color, fontSize: p.badge === '♪' ? 16 : p.badge.length === 1 ? 17 : 13 }}
              >
                {p.badge}
              </div>
              <div>
                <p className="text-[13px] font-[500]">{p.label}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>○ Not connected</p>
              </div>
              <Link
                href="/settings?tab=integrations"
                className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px] border ml-2 hover:opacity-80"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
              >
                Connect
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Campaigns table */}
      <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-subtle)' }}>
          <span className="text-[13px] font-[600]">Campaigns</span>
          {active > 0 && (
            <span className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]" style={{ background: '#e8f7ee', color: '#12a150' }}>
              {active} running
            </span>
          )}
        </div>
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Sparkles className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>No campaigns yet</p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Use the AI Campaign Builder to create your first campaign.</p>
            <Link
              href="/ads/builder"
              className="inline-flex items-center gap-1.5 px-4 py-2 mt-1 rounded-[10px] text-[13px] font-[500] text-white"
              style={{ background: 'var(--color-primary, #f97316)' }}
            >
              <Sparkles className="w-4 h-4" />
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                  {['Campaign', 'Platform', 'Status', 'Budget', 'Spent'].map(h => (
                    <th key={h} className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => {
                  const statusChip   = STATUS_CHIP[c.status]   ?? STATUS_CHIP.draft!
                  const platformChip = PLATFORM_CHIP[c.platform ?? ''] ?? { bg: '#f3f4f6', color: '#6b7280' }
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f5f7' }}>
                      <td className="px-4 py-[11px] text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{c.name}</td>
                      <td className="px-4 py-[11px]">
                        {c.platform ? (
                          <span className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]" style={platformChip}>
                            {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)}
                          </span>
                        ) : <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-[11px]">
                        <span className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]" style={statusChip}>
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-[11px] text-[13px]" style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {formatMoney(c.budget_cents, currency, { decimals: false })}
                      </td>
                      <td className="px-4 py-[11px] text-[13px]" style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {formatMoney(c.spent_cents, currency, { decimals: false })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

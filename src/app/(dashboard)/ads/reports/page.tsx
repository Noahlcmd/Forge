import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import Link from 'next/link'
import { BarChart2, TrendingUp, Target, DollarSign } from 'lucide-react'

export default async function AdsReportsPage() {
  const supabase = createClient()
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
  const orgId    = result.ok ? result.membership.organizations.id : null

  let campaigns: { id: string; name: string; platform: string | null; status: string; budget_cents: number; spent_cents: number }[] = []
  if (orgId) {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, platform, status, budget_cents, spent_cents')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
    campaigns = data ?? []
  }

  const totalSpend  = campaigns.reduce((s, c) => s + (c.spent_cents  ?? 0), 0)
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget_cents ?? 0), 0)

  const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
    active:    { bg: '#e8f7ee', color: '#12a150' },
    paused:    { bg: '#fffbeb', color: '#d97706' },
    draft:     { bg: '#f3f4f6', color: '#6b7280' },
    completed: { bg: '#eff6ff', color: '#2563eb' },
  }

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text-primary)' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]">Campaign Reports</h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            Performance across all campaigns
          </p>
        </div>
        <Link
          href="/ads/builder"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-[500] text-white"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          ✦ New Campaign
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Spend', value: `$${(totalSpend / 100).toFixed(0)}`, icon: <DollarSign className="w-[18px] h-[18px] text-red-500" />, bg: 'bg-red-50' },
          { label: 'Total Budget', value: `$${(totalBudget / 100).toFixed(0)}`, icon: <Target className="w-[18px] h-[18px] text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Active Campaigns', value: String(campaigns.filter(c => c.status === 'active').length), icon: <TrendingUp className="w-[18px] h-[18px] text-green-600" />, bg: 'bg-green-50' },
          { label: 'Total Campaigns', value: String(campaigns.length), icon: <BarChart2 className="w-[18px] h-[18px]" style={{ color: 'var(--color-primary, #f97316)' }} />, bg: '' },
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

      <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-subtle)' }}>
          <span className="text-[13px] font-[600]">All Campaigns</span>
          {campaigns.length > 0 && (
            <span className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]" style={{ background: '#e8f7ee', color: '#12a150' }}>
              {campaigns.filter(c => c.status === 'active').length} running
            </span>
          )}
        </div>
        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <BarChart2 className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No campaigns yet.</p>
            <Link
              href="/ads/builder"
              className="text-[13px] font-[500] hover:underline"
              style={{ color: 'var(--color-primary, #f97316)' }}
            >
              Create your first campaign →
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
                  const chip = STATUS_CHIP[c.status] ?? STATUS_CHIP.draft!
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f5f7' }}>
                      <td className="px-4 py-[11px] text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{c.name}</td>
                      <td className="px-4 py-[11px]">
                        {c.platform && (
                          <span className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]" style={{ background: '#eff6ff', color: '#2563eb' }}>
                            {c.platform.charAt(0).toUpperCase() + c.platform.slice(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-[11px]">
                        <span className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]" style={chip}>
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-[11px] text-[13px]" style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        ${(c.budget_cents / 100).toFixed(0)}
                      </td>
                      <td className="px-4 py-[11px] text-[13px]" style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        ${(c.spent_cents / 100).toFixed(0)}
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

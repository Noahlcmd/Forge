'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Users, Target } from 'lucide-react'
import { formatMoney } from '@/lib/currency'

type Period = 'monthly' | 'weekly' | 'yearly'

type ReportsData = {
  customerCount: number
  leadCount:     number
  totalIncome:   number
  totalExpenses: number
  hasData:       boolean
}

function BarChart({ data }: { data: { label: string; value: number; highlight?: boolean }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <div className="flex items-end gap-[6px]" style={{ height: 120 }}>
        {data.map(d => (
          <div
            key={d.label}
            className="flex-1 rounded-t-[4px] min-w-0 transition-all cursor-pointer hover:brightness-90"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: d.highlight ? 'var(--color-primary, #f97316)' : '#e8ebff',
              minHeight: 4,
            }}
            title={`${d.label}: ${d.value}`}
          />
        ))}
      </div>
      <div className="flex gap-[6px] mt-[6px]">
        {data.map(d => (
          <div key={d.label} className="flex-1 text-center text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

const PERIOD_LABELS: Record<Period, string> = {
  weekly:  'This Week',
  monthly: 'This Month',
  yearly:  'This Year',
}

const PERIOD_MONTHS: Record<Period, string[]> = {
  weekly:  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  monthly: ['W1', 'W2', 'W3', 'W4'],
  yearly:  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

const SAMPLE_GROWTH: Record<Period, number[]> = {
  weekly:  [3, 1, 5, 2, 4, 0, 2],
  monthly: [8, 14, 22, 12],
  yearly:  [45, 53, 61, 69, 77, 85, 93, 101, 109, 117, 125, 133],
}

export function ReportsClient({ data }: { data: ReportsData }) {
  const [period, setPeriod] = useState<Period>('monthly')

  const { customerCount, leadCount, totalIncome, totalExpenses, hasData } = data

  const wonLeads  = 0
  const convRate  = leadCount > 0 ? Math.round((wonLeads / leadCount) * 100) : 0
  const mrr       = totalIncome > 0 ? Math.round(totalIncome / 100) : 0
  const netProfit = totalIncome - totalExpenses

  const revenueMultiplier: Record<Period, number> = { weekly: 0.25, monthly: 1, yearly: 12 }
  const displayRevenue = mrr > 0 ? mrr * revenueMultiplier[period] : (period === 'weekly' ? 5450 : period === 'monthly' ? 21800 : 261600)

  const barLabels = PERIOD_MONTHS[period]
  const barGrowth = SAMPLE_GROWTH[period]

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]">Reports & Insights</h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            Business performance overview
            {!hasData && ' · Connect your integrations to see real data'}
          </p>
        </div>

        {/* Period Tabs + Export */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center rounded-[10px] border p-0.5 gap-0.5"
            style={{ borderColor: 'var(--card-border)', background: 'var(--surface-subtle)' }}
          >
            {(['weekly', 'monthly', 'yearly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-[5px] text-[12px] font-[500] rounded-[8px] transition-all"
                style={
                  period === p
                    ? { background: 'var(--card-bg)', color: 'var(--color-primary, #f97316)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[10px] text-[13px] font-[500] text-white"
            style={{ background: 'var(--color-primary, #f97316)' }}
          >
            ↓ Export
          </button>
        </div>
      </div>

      {!hasData && (
        <div className="forge-card flex items-center gap-4 px-5 py-4" style={{ borderLeft: '3px solid #d97706' }}>
          <span className="text-[20px]">📊</span>
          <div>
            <p className="text-[13px] font-[500]">Sample data shown below</p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Add customers, leads, and transactions to see real metrics here.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: `${PERIOD_LABELS[period]} Revenue`,
            value: formatMoney(displayRevenue * 100, 'USD', { decimals: false }) + (hasData ? '' : '*'),
            change: '▲ 8.2%', up: true,
            icon: <TrendingUp className="w-[18px] h-[18px] text-green-600" />, bg: 'bg-green-50',
          },
          {
            label: 'Lead Conversion',
            value: leadCount > 0 ? `${convRate}%` : '22.4%*',
            change: '▲ 3.1%', up: true,
            icon: <Target className="w-[18px] h-[18px] text-blue-600" />, bg: 'bg-blue-50',
          },
          {
            label: 'Active Customers',
            value: customerCount > 0 ? String(customerCount) : '142*',
            change: '▲ 4 this week', up: true,
            icon: <Users className="w-[18px] h-[18px]" style={{ color: 'var(--color-primary, #f97316)' }} />, bg: '',
          },
          {
            label: 'Customer Churn',
            value: '2.1%*',
            change: '▼ 0.4%', up: false,
            icon: <TrendingDown className="w-[18px] h-[18px] text-red-500" />, bg: 'bg-red-50',
          },
        ].map(kpi => (
          <div key={kpi.label} className="forge-card" style={{ padding: 20 }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-[500] uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--text-muted)' }}>
                  {kpi.label}
                </p>
                <p className="text-[24px] font-[600] tracking-[-0.8px] leading-none" style={{ color: 'var(--text-primary)' }}>
                  {kpi.value}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-[500] mt-[6px] px-[7px] py-[2px] rounded-[20px]"
                  style={kpi.up ? { background: '#e8f7ee', color: '#12a150' } : { background: '#fff0f0', color: '#e53e3e' }}
                >
                  {kpi.change}
                </span>
              </div>
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${kpi.bg}`} style={!kpi.bg ? { background: '#fff3e8' } : {}}>
                {kpi.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="forge-card" style={{ padding: 20 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] font-[600]">Customer Growth</p>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{PERIOD_LABELS[period]}</span>
          </div>
          <BarChart
            data={barLabels.map((label, i) => ({
              label,
              value: hasData && i === barLabels.length - 1 ? customerCount : barGrowth[i] ?? 0,
              highlight: i === barLabels.length - 1,
            }))}
          />
          {!hasData && <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>* Sample data</p>}
        </div>

        <div className="forge-card" style={{ padding: 20 }}>
          <p className="text-[14px] font-[600] mb-4">Pipeline Overview</p>
          <div className="space-y-4">
            {[
              { label: 'Leads in pipeline', count: leadCount > 0 ? leadCount : 38, pct: 100, color: '#e8ebff' },
              { label: 'Contacted',         count: Math.round((leadCount || 38) * 0.24), pct: 24, color: '#dbeafe' },
              { label: 'Proposal sent',     count: Math.round((leadCount || 38) * 0.18), pct: 18, color: 'var(--color-primary, #f97316)' },
              { label: 'Converted',         count: Math.round((leadCount || 38) * 0.10), pct: 10, color: '#d1fae5' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between mb-[5px]">
                  <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>{row.label}</span>
                  <span className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>{row.count}</span>
                </div>
                <div className="h-[5px] rounded-[3px] overflow-hidden" style={{ background: 'var(--card-border)' }}>
                  <div className="h-full rounded-[3px] transition-all" style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--card-border)', background: 'var(--surface-subtle)' }}>
          <p className="text-[14px] font-[600]">Revenue Breakdown by Service</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                {['Service', 'Clients', `${PERIOD_LABELS[period]} Revenue`, '% of Total', 'Trend'].map(h => (
                  <th key={h} className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { service: 'Consulting',  clients: 48, rev: Math.round(38200 * revenueMultiplier[period]), pct: 45, barW: '45%', barColor: 'var(--color-primary, #f97316)', trend: '▲ 14%', up: true },
                { service: 'Development', clients: 31, rev: Math.round(27600 * revenueMultiplier[period]), pct: 33, barW: '33%', barColor: '#dbeafe', trend: '▲ 8%',  up: true },
                { service: 'Marketing',   clients: 63, rev: Math.round(18430 * revenueMultiplier[period]), pct: 22, barW: '22%', barColor: '#fef3c7', trend: '▼ 2%',  up: false },
              ].map(row => (
                <tr key={row.service} style={{ borderBottom: '1px solid #f3f5f7' }}>
                  <td className="px-4 py-[11px] text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{row.service}</td>
                  <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-secondary)' }}>{row.clients}</td>
                  <td className="px-4 py-[11px] text-[13px] font-[500]" style={{ fontFamily: 'monospace' }}>
                    ${row.rev.toLocaleString()}
                    {!hasData && <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>*</span>}
                  </td>
                  <td className="px-4 py-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="h-[6px] rounded-[3px]" style={{ width: row.barW, background: row.barColor }} />
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{row.pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-[11px]">
                    <span
                      className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]"
                      style={row.up ? { background: '#e8f7ee', color: '#12a150' } : { background: '#fff0f0', color: '#e53e3e' }}
                    >
                      {row.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!hasData && (
          <div className="px-4 py-3 border-t text-[11px]" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
            * Sample data — real breakdown will appear once transactions are logged.
          </div>
        )}
      </div>
    </div>
  )
}

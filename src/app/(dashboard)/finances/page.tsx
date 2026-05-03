import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { getDemoMode } from '@/lib/demo'
import { formatMoney } from '@/lib/currency'
import { DollarSign, TrendingUp, TrendingDown, Receipt, ArrowRight, Zap, CreditCard, Download } from 'lucide-react'

type Invoice = {
  id:           string
  number:       string
  status:       string
  amount_cents: number
  currency:     string
  due_date:     string | null
  created_at:   string
}

type Transaction = {
  id:          string
  type:        'income' | 'expense'
  amount_cents: number
  currency:    string
  description: string
  category:    string | null
  date:        string
}

const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#f3f4f6', color: '#6b7280' },
  sent:      { bg: '#eff6ff', color: '#2563eb' },
  paid:      { bg: '#e8f7ee', color: '#12a150' },
  overdue:   { bg: '#fff0f0', color: '#e53e3e' },
  cancelled: { bg: '#f3f4f6', color: '#9ca3af' },
}

const DEMO_INVOICES: Invoice[] = [
  { id: '1', number: 'INV-001', status: 'paid',    amount_cents: 450000, currency: 'USD', due_date: null,         created_at: '' },
  { id: '2', number: 'INV-002', status: 'sent',    amount_cents: 275000, currency: 'USD', due_date: '2026-05-10', created_at: '' },
  { id: '3', number: 'INV-003', status: 'overdue', amount_cents: 180000, currency: 'USD', due_date: '2026-04-15', created_at: '' },
  { id: '4', number: 'INV-004', status: 'draft',   amount_cents: 320000, currency: 'USD', due_date: null,         created_at: '' },
]

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'income',  amount_cents: 450000, currency: 'USD', description: 'Acme Corp — Consulting',   category: 'Consulting', date: '2026-04-22' },
  { id: '2', type: 'income',  amount_cents: 275000, currency: 'USD', description: 'TechVentures — Retainer', category: 'Retainer',   date: '2026-04-18' },
  { id: '3', type: 'expense', amount_cents:  89000, currency: 'USD', description: 'Ads spend — Meta',         category: 'Marketing',  date: '2026-04-15' },
  { id: '4', type: 'income',  amount_cents: 180000, currency: 'USD', description: 'BluePeak — Development',  category: 'Dev',        date: '2026-04-10' },
  { id: '5', type: 'expense', amount_cents:  34000, currency: 'USD', description: 'SaaS Tools',               category: 'Software',   date: '2026-04-05' },
]

export default async function FinancesPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
  const supabase = createClient()
  const isDemo   = getDemoMode()

  const org       = result.ok ? result.membership.organizations : null
  const orgId     = org?.id ?? null
  const subStatus = org?.subscription_status ?? 'inactive'
  const currency  = (org?.settings?.currency as string | undefined) ?? 'USD'

  let invoices:     Invoice[]     = []
  let transactions: Transaction[] = []
  let totalIncome   = 0
  let totalExpenses = 0

  if (isDemo) {
    invoices     = DEMO_INVOICES
    transactions = DEMO_TRANSACTIONS
    totalIncome   = DEMO_TRANSACTIONS.filter(t => t.type === 'income') .reduce((s, t) => s + t.amount_cents, 0)
    totalExpenses = DEMO_TRANSACTIONS.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_cents, 0)
  } else if (orgId) {
    const [invRes, txRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('id, number, status, amount_cents, currency, due_date, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('transactions')
        .select('id, type, amount_cents, currency, description, category, date')
        .eq('organization_id', orgId)
        .order('date', { ascending: false })
        .limit(20),
    ])

    if (invRes.error)  console.error('[finances] invoices query error:',     invRes.error.message)
    if (txRes.error)   console.error('[finances] transactions query error:', txRes.error.message)

    invoices     = (invRes.data  ?? []) as Invoice[]
    transactions = (txRes.data   ?? []) as Transaction[]

    totalIncome   = transactions.filter(t => t.type === 'income')  .reduce((s, t) => s + t.amount_cents, 0)
    totalExpenses = transactions.filter(t => t.type === 'expense') .reduce((s, t) => s + t.amount_cents, 0)
  }

  const net = totalIncome - totalExpenses

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
            Finances
          </h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            Revenue tracking · {org?.name ?? 'Your organization'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings?tab=integrations"
            className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[13px] font-[500] rounded-[10px] border transition-all"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)', background: 'var(--card-bg)' }}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Connect Stripe
          </Link>
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[13px] font-[500] rounded-[10px] transition-all text-white"
            style={{ background: 'var(--color-primary, #f97316)' }}
          >
            <Zap className="w-3.5 h-3.5" />
            Manage Billing
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="forge-card" style={{ padding: 20 }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-[500] uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--text-muted)' }}>
                Total Revenue
              </p>
              <p className="text-[26px] font-[600] tracking-[-0.8px] leading-none" style={{ color: 'var(--text-primary)' }}>
                {totalIncome > 0 ? formatMoney(totalIncome, currency) : '—'}
              </p>
              {totalIncome === 0 && (
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>No transactions yet</p>
              )}
            </div>
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-green-50">
              <TrendingUp className="w-[18px] h-[18px] text-green-600" />
            </div>
          </div>
        </div>

        <div className="forge-card" style={{ padding: 20 }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-[500] uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--text-muted)' }}>
                Total Expenses
              </p>
              <p className="text-[26px] font-[600] tracking-[-0.8px] leading-none" style={{ color: 'var(--text-primary)' }}>
                {totalExpenses > 0 ? formatMoney(totalExpenses, currency) : '—'}
              </p>
              {totalExpenses === 0 && (
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>No expenses logged</p>
              )}
            </div>
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-red-50">
              <TrendingDown className="w-[18px] h-[18px] text-red-500" />
            </div>
          </div>
        </div>

        <div className="forge-card" style={{ padding: 20 }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-[500] uppercase tracking-[0.06em] mb-1" style={{ color: 'var(--text-muted)' }}>
                Net Profit
              </p>
              <p
                className="text-[26px] font-[600] tracking-[-0.8px] leading-none"
                style={{ color: net >= 0 ? '#12a150' : '#e53e3e' }}
              >
                {totalIncome > 0 || totalExpenses > 0 ? formatMoney(net, currency) : '—'}
              </p>
              {totalIncome === 0 && totalExpenses === 0 && (
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>Revenue - expenses</p>
              )}
            </div>
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-blue-50">
              <DollarSign className="w-[18px] h-[18px] text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      <div
        className="forge-card flex items-center gap-4"
        style={{ padding: '16px 20px' }}
      >
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: '#eef0ff' }}>
          <CreditCard className="w-[18px] h-[18px]" style={{ color: '#4f5fd4' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>
            Forge Subscription
          </p>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Status:{' '}
            <span
              className="font-[500]"
              style={{
                color: subStatus === 'active' ? '#12a150'
                  : subStatus === 'trialing' ? '#2563eb'
                  : '#9ca3af',
              }}
            >
              {subStatus.charAt(0).toUpperCase() + subStatus.slice(1)}
            </span>
          </p>
        </div>
        <Link
          href="/billing"
          className="inline-flex items-center gap-1 text-[12px] font-[500] transition-colors"
          style={{ color: 'var(--color-primary, #f97316)' }}
        >
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Invoices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>Invoices</h2>
          </div>
          {invoices.length === 0 ? (
            <div
              className="forge-card flex flex-col items-center justify-center py-14 text-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f3f4f6' }}>
                <Receipt className="w-5 h-5" style={{ color: '#9ca3af' }} />
              </div>
              <div>
                <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>No invoices yet</p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Connect Stripe to manage invoices and payments.
                </p>
              </div>
              <Link
                href="/settings?tab=integrations"
                className="text-[12px] font-[500] transition-colors hover:underline"
                style={{ color: 'var(--color-primary, #f97316)' }}
              >
                Connect integration →
              </Link>
            </div>
          ) : (
            <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                    {['Invoice', 'Amount', 'Status', 'Due', ''].map(h => (
                      <th key={h} className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const chip = STATUS_CHIP[inv.status] ?? STATUS_CHIP.draft
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f3f5f7' }}>
                        <td className="px-4 py-[11px] text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{inv.number}</td>
                        <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-secondary)' }}>{formatMoney(inv.amount_cents, inv.currency)}</td>
                        <td className="px-4 py-[11px]">
                          <span className="chip" style={{ background: chip.bg, color: chip.color }}>
                            {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-[11px] text-right">
                          <Link
                            href={`/invoice/${inv.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-[6px] border transition-colors"
                            style={{ color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}
                          >
                            <Download className="w-3 h-3" /> PDF
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>Recent Transactions</h2>
          </div>
          {transactions.length === 0 ? (
            <div
              className="forge-card flex flex-col items-center justify-center py-14 text-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f3f4f6' }}>
                <DollarSign className="w-5 h-5" style={{ color: '#9ca3af' }} />
              </div>
              <div>
                <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>No transactions yet</p>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Transactions will appear here once connected.
                </p>
              </div>
            </div>
          ) : (
            <div className="forge-card" style={{ padding: 0 }}>
              {transactions.map(tx => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-4 py-[11px] border-b last:border-0"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: tx.type === 'income' ? '#e8f7ee' : '#fff0f0',
                    }}
                  >
                    {tx.type === 'income'
                      ? <TrendingUp  className="w-3.5 h-3.5 text-green-600" />
                      : <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[500] truncate" style={{ color: 'var(--text-primary)' }}>{tx.description}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {tx.category ?? tx.type} · {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <p
                    className="text-[13px] font-[600] shrink-0"
                    style={{ color: tx.type === 'income' ? '#12a150' : '#e53e3e' }}
                  >
                    {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount_cents, tx.currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

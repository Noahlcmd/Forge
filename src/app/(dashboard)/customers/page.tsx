import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { getDemoMode } from '@/lib/demo'
import { sanitizeSearchQuery } from '@/lib/sanitize'
import { AddCustomerForm } from './AddCustomerForm'
import { ExportButton } from './ExportButton'
import { CustomerFilters } from './CustomerFilters'
import { CustomersClient } from './CustomersClient'
import { ErrorState } from '@/components/ui/StatusStates'

export type Customer = {
  id:         string
  name:       string
  email:      string | null
  phone:      string | null
  company:    string | null
  status:     string | null
  created_at: string
}

const DEMO_CUSTOMERS: Customer[] = [
  { id: '1', name: 'Sarah Johnson',  email: 'sarah@acmecorp.com',   phone: '+1 555-0101', company: 'Acme Corp',       status: 'active',   created_at: '2026-03-15' },
  { id: '2', name: 'Mike Chen',      email: 'mike@techventures.io', phone: '+1 555-0102', company: 'TechVentures',    status: 'active',   created_at: '2026-03-08' },
  { id: '3', name: 'Lisa Park',      email: 'lisa@bluepeak.co',     phone: null,          company: 'BluePeak',        status: 'active',   created_at: '2026-02-20' },
  { id: '4', name: 'Tom Walker',     email: 'tom@skyline.com',      phone: '+1 555-0104', company: 'Skyline Digital', status: 'paused',   created_at: '2026-02-10' },
  { id: '5', name: 'Emma Davis',     email: 'emma@novaweb.io',      phone: '+1 555-0105', company: 'NovaWeb',         status: 'inactive', created_at: '2026-01-28' },
]

interface Props {
  searchParams: { q?: string; status?: string }
}

export default async function CustomersPage({ searchParams }: Props) {
  const q      = String(searchParams?.q      ?? '').trim()
  const status = String(searchParams?.status ?? '').trim()

  // ── auth ──────────────────────────────────────────────────────────────────
  let result: Awaited<ReturnType<typeof getAppUser>>
  try {
    result = await getAppUser()
  } catch (e) {
    console.error('[customers] getAppUser threw:', e)
    result = { ok: false, reason: 'no_user' } as const
  }

  // ── demo mode ─────────────────────────────────────────────────────────────
  let isDemo = false
  try { isDemo = getDemoMode() } catch {}

  const orgName = result.ok ? (result.membership.organizations.name ?? 'Your organization') : 'Your organization'

  // ── fetch data ────────────────────────────────────────────────────────────
  let customers:  Customer[] = []
  let queryError: string | null = null

  if (isDemo) {
    customers = DEMO_CUSTOMERS.filter(c =>
      (!q      || [c.name, c.email, c.company].some(f => f?.toLowerCase().includes(q.toLowerCase()))) &&
      (!status || c.status === status)
    )
  } else if (result.ok) {
    const orgId = result.membership.organizations.id
    try {
      const supabase = createClient()
      let dbQuery = supabase
        .from('customers')
        .select('id, name, email, phone, company, status, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

      if (q) {
        const safeQ = sanitizeSearchQuery(q)
        if (safeQ) dbQuery = dbQuery.or(`name.ilike.%${safeQ}%,email.ilike.%${safeQ}%,company.ilike.%${safeQ}%`)
      }
      if (status) dbQuery = dbQuery.eq('status', status)

      const { data, error } = await dbQuery

      if (error) {
        console.error('[customers] query error:', error.code, error.message)
        queryError = 'Could not load customers. Please try refreshing the page.'
      } else {
        customers = (data ?? []) as Customer[]
      }
    } catch (e) {
      console.error('[customers] unexpected error:', e)
      queryError = 'Could not load customers. Please try refreshing the page.'
    }
  } else {
    console.error('[customers] not authenticated, reason:', result.reason)
    queryError = 'Session expired. Please sign in again.'
  }

  const isFiltered = !!(q || status)

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
            Customers
          </h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            {customers.length > 0
              ? `${customers.length} client${customers.length === 1 ? '' : 's'}${isFiltered ? ' (filtered)' : ''} · ${orgName}`
              : `CRM database · ${orgName}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton customers={customers} />
          <AddCustomerForm />
        </div>
      </div>

      {/* DB error banner */}
      {queryError && <ErrorState message={queryError} />}

      {/* Filters */}
      <Suspense fallback={<div className="forge-card p-3 h-[52px]" />}>
        <CustomerFilters />
      </Suspense>

      {/* Table — Client Component owns all interactivity */}
      <CustomersClient customers={customers} queryError={queryError} isFiltered={isFiltered} />

    </div>
  )
}

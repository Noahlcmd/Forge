'use client'

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Users, Download } from 'lucide-react'
import { ToolCard } from './ToolCard'
import { SearchBar, type SearchFilters } from './SearchBar'
import { LeadsTable, type DemoLead } from './LeadsTable'

const DEMO_LEADS: DemoLead[] = [
  { id: 'd1', company_name: 'Acme Corp',       industry: 'SaaS / Software', location: 'San Francisco, CA', company_size: '51–200',  revenue_estimate: '$5M–$20M',  contact_name: 'Sarah Chen',    score: 91 },
  { id: 'd2', company_name: 'BrightWave',       industry: 'Marketing',       location: 'New York, NY',       company_size: '11–50',   revenue_estimate: '$1M–$5M',   contact_name: 'James Okafor', score: 78 },
  { id: 'd3', company_name: 'MedCore Systems',  industry: 'Healthcare',      location: 'Austin, TX',         company_size: '201–500', revenue_estimate: '$20M–$50M', contact_name: 'Priya Nair',   score: 65 },
  { id: 'd4', company_name: 'FreightLogix',     industry: 'Supply Chain',    location: 'Chicago, IL',        company_size: '51–200',  revenue_estimate: '$10M–$30M', contact_name: 'David Park',   score: 84 },
  { id: 'd5', company_name: 'ShopSphere',       industry: 'E-Commerce',      location: 'Los Angeles, CA',    company_size: '11–50',   revenue_estimate: '$2M–$8M',   contact_name: 'Mia Thompson', score: 55 },
  { id: 'd6', company_name: 'Verdant Finance',  industry: 'Finance',         location: 'Nashville, TN',      company_size: '11–50',   revenue_estimate: '$3M–$10M',  contact_name: 'Carlos Rivera',score: 72 },
  { id: 'd7', company_name: 'HarvestAI',        industry: 'Agriculture',     location: 'Austin, TX',         company_size: '1–10',    revenue_estimate: '<$1M',      contact_name: 'Leila Ahmadi', score: 48 },
  { id: 'd8', company_name: 'StackVelocity',    industry: 'SaaS / Software', location: 'Seattle, WA',        company_size: '11–50',   revenue_estimate: '$1M–$5M',   contact_name: 'Noah Williams',score: 88 },
]

const TOOLS = [
  { name: 'LinkedIn Sales Navigator', initial: 'LI', color: 'bg-blue-600',    connected: false },
  { name: 'Apollo.io',                initial: 'Ap', color: 'bg-purple-600',  connected: false },
  { name: 'Clearbit',                 initial: 'Cb', color: 'bg-emerald-600', connected: false },
  { name: 'Hunter.io',                initial: 'Hu', color: 'bg-orange-600',  connected: true  },
]

function matchesFilters(lead: DemoLead, f: SearchFilters): boolean {
  if (f.query) {
    const q = f.query.toLowerCase()
    if (
      !lead.company_name.toLowerCase().includes(q) &&
      !lead.industry.toLowerCase().includes(q) &&
      !lead.location.toLowerCase().includes(q) &&
      !lead.contact_name.toLowerCase().includes(q)
    ) return false
  }
  if (f.industry && lead.industry !== f.industry) return false
  if (f.location && lead.location !== f.location) return false
  if (f.size     && lead.company_size !== f.size)  return false
  return true
}

export function FindingClientsClient() {
  const [filters,     setFilters]     = useState<SearchFilters>({ query: '', industry: '', location: '', size: '' })
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set())
  const [importing,   setImporting]   = useState<Set<string>>(new Set())

  const filtered = useMemo(() => DEMO_LEADS.filter(l => matchesFilters(l, filters)), [filters])

  function handleToggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleToggleAll(ids: string[]) {
    const allSelected = ids.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) { ids.forEach(id => next.delete(id)) }
      else             { ids.forEach(id => next.add(id))    }
      return next
    })
  }

  async function handleImport(lead: DemoLead) {
    if (importedIds.has(lead.id) || importing.has(lead.id)) return

    if (!lead.company_name?.trim()) {
      toast.error('Cannot import lead: company name is missing')
      return
    }

    setImporting(prev => { const n = new Set(prev); n.add(lead.id); return n })

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company:      lead.company_name,
          contact_name: lead.contact_name,
          industry:     lead.industry,
          location:     lead.location,
          size:         lead.company_size,
          revenue:      lead.revenue_estimate,
          score:        lead.score,
        }),
      })

      if (res.ok) {
        setImportedIds(prev => { const n = new Set(prev); n.add(lead.id); return n })
        toast.success(`${lead.company_name} added to leads`)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to import lead')
      }
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setImporting(prev => { const n = new Set(prev); n.delete(lead.id); return n })
    }
  }

  async function handleBulkImport() {
    const toImport = filtered.filter(l => selected.has(l.id) && !importedIds.has(l.id) && !importing.has(l.id))
    if (toImport.length === 0) return
    await Promise.all(toImport.map(handleImport))
  }

  const pendingSelected = filtered.filter(l => selected.has(l.id) && !importedIds.has(l.id) && !importing.has(l.id))

  return (
    <div className="space-y-5">

      {/* Data sources */}
      <div>
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Data sources</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TOOLS.map(t => <ToolCard key={t.name} {...t} />)}
        </div>
      </div>

      {/* Lead discovery panel */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] overflow-hidden">

        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Lead Discovery</span>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded-full tabular-nums">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {pendingSelected.length > 0 && (
            <button
              onClick={handleBulkImport}
              disabled={importing.size > 0}
              className="h-8 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              Import {pendingSelected.length} selected
            </button>
          )}
        </div>

        <div className="px-4 py-3 border-b border-[var(--card-border)]/60">
          <SearchBar onFilter={setFilters} />
        </div>

        <LeadsTable
          leads={filtered}
          selected={selected}
          importedIds={importedIds}
          importing={importing}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          onImport={handleImport}
        />
      </div>
    </div>
  )
}

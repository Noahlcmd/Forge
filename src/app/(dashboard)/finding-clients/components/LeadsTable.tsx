'use client'

import { useRef, useEffect } from 'react'
import { CheckCircle2, Download, Loader2, MapPin, Building2 } from 'lucide-react'
import { ScoreBadge } from './ScoreBadge'

export interface DemoLead {
  id:               string
  company_name:     string
  industry:         string
  location:         string
  company_size:     string
  revenue_estimate: string
  contact_name:     string
  score:            number
}

interface LeadsTableProps {
  leads:       DemoLead[]
  selected:    Set<string>
  importedIds: Set<string>
  importing:   Set<string>
  onToggle:    (id: string) => void
  onToggleAll: (ids: string[]) => void
  onImport:    (lead: DemoLead) => void
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-rose-500', 'bg-cyan-500',
]

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-3.5 h-3.5 rounded border-zinc-700 accent-orange-500 cursor-pointer"
    />
  )
}

export function LeadsTable({
  leads, selected, importedIds, importing, onToggle, onToggleAll, onImport,
}: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-zinc-700/60 flex items-center justify-center mb-3">
          <Building2 className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">No leads match your filters</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Try adjusting your search or clearing the filters</p>
      </div>
    )
  }

  const allIds     = leads.map(l => l.id)
  const allChecked = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someChecked = !allChecked && allIds.some(id => selected.has(id))

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[860px] w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--card-border)]">
            <th className="w-10 px-4 py-3">
              <IndeterminateCheckbox
                checked={allChecked}
                indeterminate={someChecked}
                onChange={() => onToggleAll(allIds)}
              />
            </th>
            {(['Company', 'Industry', 'Location', 'Size', 'Revenue', 'Contact', 'Score', ''] as const).map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {leads.map(lead => {
            const isSelected  = selected.has(lead.id)
            const isImported  = importedIds.has(lead.id)
            const isImporting = importing.has(lead.id)

            return (
              <tr
                key={lead.id}
                className={`transition-colors hover:bg-[var(--surface-subtle)]/30 ${isSelected ? 'bg-orange-500/5' : ''}`}
              >
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(lead.id)}
                    className="w-3.5 h-3.5 rounded border-zinc-700 accent-orange-500 cursor-pointer"
                  />
                </td>

                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarColor(lead.company_name)}`}>
                      {lead.company_name[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-[var(--text-primary)] whitespace-nowrap">{lead.company_name}</span>
                  </div>
                </td>

                <td className="px-4 py-3.5 text-[var(--text-secondary)] whitespace-nowrap">{lead.industry}</td>

                <td className="px-4 py-3.5">
                  <span className="flex items-center gap-1 text-[var(--text-secondary)] whitespace-nowrap">
                    <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
                    {lead.location}
                  </span>
                </td>

                <td className="px-4 py-3.5 text-[var(--text-secondary)] whitespace-nowrap">{lead.company_size}</td>

                <td className="px-4 py-3.5 text-[var(--text-secondary)] whitespace-nowrap">{lead.revenue_estimate}</td>

                <td className="px-4 py-3.5 text-[var(--text-secondary)] whitespace-nowrap">{lead.contact_name}</td>

                <td className="px-4 py-3.5">
                  <ScoreBadge score={lead.score} />
                </td>

                <td className="px-4 py-3.5">
                  {isImported ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-400/10 px-2.5 py-1 rounded-md border border-green-400/20 whitespace-nowrap">
                      <CheckCircle2 className="w-3 h-3" />
                      Imported
                    </span>
                  ) : (
                    <button
                      onClick={() => onImport(lead)}
                      disabled={isImporting || importing.size > 0}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-orange-400 px-2.5 py-1 rounded-md border border-zinc-700 hover:border-orange-500/40 hover:bg-orange-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isImporting
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Download className="w-3 h-3" />
                      }
                      {isImporting ? 'Importing…' : 'Import'}
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Users, Mail, Phone } from 'lucide-react'
import { EmptyState } from '@/components/ui/StatusStates'
import type { Customer } from './page'

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:   { bg: '#e8f7ee', color: '#12a150' },
  paused:   { bg: '#fffbeb', color: '#d97706' },
  inactive: { bg: '#f3f4f6', color: '#6b7280' },
  churned:  { bg: '#f3f4f6', color: '#6b7280' },
}

interface Props {
  customers:  Customer[]
  queryError: string | null
  isFiltered: boolean
}

export function CustomersClient({ customers, queryError, isFiltered }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (customers.length === 0 && !queryError) {
    return (
      <EmptyState
        icon={<Users className="w-6 h-6" style={{ color: '#9ca3af' }} />}
        title={isFiltered ? 'No customers match your search' : 'No customers yet'}
        description={isFiltered ? 'Try a different search or clear filters.' : 'Add your first customer to get started.'}
      />
    )
  }

  if (customers.length === 0) return null

  return (
    <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
              {['Name', 'Company', 'Email', 'Phone', 'Status', 'Added'].map(h => (
                <th
                  key={h}
                  className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em] whitespace-nowrap"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map(c => {
              const statusStyle = STATUS_STYLE[c.status ?? 'inactive'] ?? STATUS_STYLE.inactive
              const isHovered   = hoveredId === c.id
              return (
                <tr
                  key={c.id}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid #f3f5f7',
                    background: isHovered ? 'var(--input-bg)' : undefined,
                  }}
                  onMouseEnter={() => setHoveredId(c.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <td className="px-4 py-[11px]">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-[700] text-white"
                        style={{ background: '#6b7cff' }}
                      >
                        {((c.name || '?')[0]).toUpperCase()}
                      </div>
                      <span className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>
                        {c.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {c.company ?? '—'}
                  </td>
                  <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {c.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        {c.email}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {c.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        {c.phone}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-[11px]">
                    <span className="chip" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                      {(c.status ?? 'inactive').charAt(0).toUpperCase() + (c.status ?? 'inactive').slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(c.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface-subtle)', borderTop: '1px solid var(--card-border)' }}
      >
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Showing {customers.length} of {customers.length} customer{customers.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}

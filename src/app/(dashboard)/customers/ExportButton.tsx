'use client'

import { Download } from 'lucide-react'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string | null
  created_at: string
}

export function ExportButton({ customers }: { customers: Customer[] }) {
  function handleExport() {
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Status', 'Added']
    const rows = customers.map(c => [
      c.name,
      c.company ?? '',
      c.email ?? '',
      c.phone ?? '',
      c.status ?? '',
      new Date(c.created_at).toLocaleDateString('en-US'),
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      disabled={customers.length === 0}
      className="inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] font-[500] rounded-[10px] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
    >
      <Download className="w-4 h-4" />
      Export
    </button>
  )
}

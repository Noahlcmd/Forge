'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"
      style={{ color: 'var(--text-primary)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: '#fff0f0' }}
      >
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>

      <h2 className="text-[20px] font-[600] mb-2" style={{ color: 'var(--text-primary)' }}>
        Something went wrong
      </h2>
      <p className="text-[14px] max-w-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        The dashboard failed to load. This may be a temporary issue. Try refreshing the page.
      </p>

      {error.digest && (
        <p className="text-[11px] font-mono mb-6 px-3 py-1.5 rounded-lg bg-gray-100" style={{ color: '#6b7280' }}>
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-[500] text-white transition-colors"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
        <Link
          href="/billing"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-[500] border transition-colors"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
        >
          Go to billing
        </Link>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error:  Error & { digest?: string }
  reset:  () => void
}) {
  useEffect(() => {
    console.error('[dashboard] Unhandled error:', error.message, error.digest)
  }, [error])

  return (
    <div
      className="flex flex-col flex-1 items-center justify-center p-6 gap-5 min-h-[50vh]"
      style={{ color: 'var(--text-primary)' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: '#fff0f0' }}
      >
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-[16px] font-[600]" style={{ color: 'var(--text-primary)' }}>
          Something went wrong
        </p>
        <p className="text-[13px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono mt-1.5 px-2 py-1 rounded-md inline-block" style={{ background: '#f3f4f6', color: '#6b7280' }}>
            ref: {error.digest}
          </p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-[500] text-white transition-colors"
        style={{ background: 'var(--color-primary, #f97316)' }}
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  )
}

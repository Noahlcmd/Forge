'use client'

import { AlertTriangle } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Failed to load customers</p>
        <p className="text-xs mt-1 font-mono text-red-500">{error?.message || 'Unknown error'}</p>
        {error?.digest && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>digest: {error.digest}</p>
        )}
      </div>
      <button onClick={reset} className="btn btn-secondary btn-sm">Try again</button>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export function RefreshButton() {
  const [loading, setLoading] = useState(false)

  function handleRefresh() {
    setLoading(true)
    // Full page reload re-runs the server component and re-fetches status from DB
    window.location.reload()
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 transition-colors"
    >
      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
      Check activation status
    </button>
  )
}

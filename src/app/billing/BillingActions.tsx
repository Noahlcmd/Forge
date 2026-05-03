'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  isActive: boolean
  hasCustomer: boolean
}

export default function BillingActions({ isActive, hasCustomer }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function callEndpoint(endpoint: string) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      let data: any = {}
      try {
        data = await res.json()
      } catch {
        // ignore JSON parse errors
      }

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`)
      }

      if (!data?.url) {
        throw new Error('No redirect URL returned from server')
      }

      window.location.href = data.url
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {isActive && hasCustomer ? (
        <button
          onClick={() => callEndpoint('/api/billing/portal')}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 text-sm font-medium border border-zinc-700 transition"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Manage Billing
        </button>
      ) : (
        <button
          onClick={() => callEndpoint('/api/billing/checkout')}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-white text-sm font-medium transition"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Subscribe Now
        </button>
      )}

      {error && (
        <p className="text-xs text-red-400 text-center rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
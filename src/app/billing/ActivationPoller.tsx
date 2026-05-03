'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'

const POLL_INTERVAL_MS = 2500
const MAX_ATTEMPTS     = 20  // 50 seconds before giving up

const ACTIVE_STATUSES = new Set(['active', 'trialing'])

export function ActivationPoller() {
  const router   = useRouter()
  const [attempts, setAttempts] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopped  = useRef(false)

  useEffect(() => {
    stopped.current = false

    async function poll() {
      if (stopped.current) return

      try {
        const res = await fetch('/api/billing/status', { cache: 'no-store' })
        if (res.ok) {
          const { status } = await res.json()
          console.log('[ActivationPoller] status:', status)

          if (ACTIVE_STATUSES.has(status)) {
            stopped.current = true
            router.push('/dashboard')
            return
          }
        }
      } catch (err) {
        console.warn('[ActivationPoller] poll error:', err)
      }

      setAttempts(a => {
        const next = a + 1
        if (next < MAX_ATTEMPTS && !stopped.current) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
        }
        return next
      })
    }

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)

    return () => {
      stopped.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [router])

  if (attempts >= MAX_ATTEMPTS) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-zinc-500 text-center">
          Activation is taking longer than expected.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh to check status
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
      <span className="text-xs text-zinc-400">
        Activating your account
        {attempts > 0 ? ` (${attempts}/${MAX_ATTEMPTS})` : '…'}
      </span>
    </div>
  )
}

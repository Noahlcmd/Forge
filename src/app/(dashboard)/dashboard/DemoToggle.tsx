'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export function DemoToggle({ isDemo }: { isDemo: boolean }) {
  const router  = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      await fetch('/api/demo', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled: !isDemo }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3 py-[6px] text-[13px] font-[500] rounded-[10px] border transition-all disabled:opacity-60"
      style={
        isDemo
          ? { background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }
          : { background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }
      }
      title={isDemo ? 'Exit demo mode' : 'Preview with demo data'}
    >
      {busy
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : isDemo
          ? <EyeOff className="w-3.5 h-3.5" />
          : <Eye className="w-3.5 h-3.5" />
      }
      {isDemo ? 'Exit Demo' : 'View Demo'}
    </button>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface Props {
  token:    string
  orgName:  string
  role:     string
  email:    string
  // null = not logged in; string = logged-in user's email
  userEmail: string | null
}

export function AcceptInviteClient({ token, orgName, role, email, userEmail }: Props) {
  const router   = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)

  const roleLabel = role === 'admin' ? 'Admin' : 'Member'

  // The logged-in user's email doesn't match the invite email
  const emailMismatch = userEmail && userEmail.toLowerCase() !== email.toLowerCase()

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/invite/accept', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to accept invitation.')
      setDone(true)
      // Brief pause so the user sees the success state, then redirect
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <Card>
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-4" />
        <h2 className="text-[18px] font-[600] text-center text-white mb-1">You&apos;ve joined {orgName}!</h2>
        <p className="text-center text-[13px] text-zinc-400">Redirecting to your dashboard…</p>
      </Card>
    )
  }

  return (
    <Card>
      {/* Org logo placeholder */}
      <div className="w-12 h-12 rounded-[12px] flex items-center justify-center mx-auto mb-4 text-[20px] font-[700] text-white"
        style={{ background: 'var(--color-primary, #f97316)' }}>
        {orgName[0]?.toUpperCase() ?? 'F'}
      </div>

      <h2 className="text-[20px] font-[600] text-center text-white mb-1">
        Join {orgName}
      </h2>
      <p className="text-center text-[13px] text-zinc-400 mb-6">
        You&apos;ve been invited as a <span className="text-white font-[500]">{roleLabel}</span>
      </p>

      {/* Email mismatch warning */}
      {emailMismatch && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-[8px] mb-4 text-[13px]"
          style={{ background: '#2d1515', color: '#fc8181', border: '1px solid #4a1c1c' }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-[1px]" />
          <span>
            This invite was sent to <strong>{email}</strong>. You&apos;re signed in as <strong>{userEmail}</strong>.
            Please sign out and sign in with the correct email.
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] mb-4 text-[13px]"
          style={{ background: '#2d1515', color: '#fc8181', border: '1px solid #4a1c1c' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Logged in and email matches — show accept button */}
      {userEmail && !emailMismatch && (
        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full py-2.5 rounded-[10px] text-[14px] font-[600] text-white transition-opacity disabled:opacity-60"
          style={{ background: 'var(--color-primary, #f97316)' }}
        >
          {loading
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Joining…</span>
            : `Join ${orgName}`}
        </button>
      )}

      {/* Not logged in — show sign-in / sign-up options */}
      {!userEmail && (
        <div className="flex flex-col gap-3">
          <a
            href={`/signup?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
            className="w-full py-2.5 rounded-[10px] text-[14px] font-[600] text-white text-center block transition-opacity"
            style={{ background: 'var(--color-primary, #f97316)' }}
          >
            Create account to join
          </a>
          <a
            href={`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
            className="w-full py-2.5 rounded-[10px] text-[14px] font-[500] text-center block transition-colors"
            style={{ border: '1px solid #333', color: '#a1a1aa' }}
          >
            Sign in instead
          </a>
        </div>
      )}

      <p className="text-center text-[11px] text-zinc-600 mt-5">
        Invite sent to <span className="text-zinc-400">{email}</span> · expires in 24 hours
      </p>
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0d0f14' }}>
      <div className="w-full max-w-sm rounded-[16px] p-8" style={{ background: '#111318', border: '1px solid #1e2128' }}>
        {children}
      </div>
    </div>
  )
}

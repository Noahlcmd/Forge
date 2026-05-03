'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail } from 'lucide-react'

export default function LoginForm({ next }: { next?: string } = {}) {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const callbackNext = next ? encodeURIComponent(next) : ''
    const emailRedirectTo = callbackNext
      ? `${window.location.origin}/auth/callback?next=${callbackNext}`
      : `${window.location.origin}/auth/callback`

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Must point to the callback handler so the PKCE code is exchanged
        // for a real server-side session before redirecting to /dashboard.
        emailRedirectTo,
      },
    })

    setLoading(false)

    if (otpError) {
      setError(otpError.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center py-4">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Check your email</h2>
            <p className="text-sm text-zinc-400 mt-2">
              We sent a magic link to{' '}
              <span className="text-zinc-200 font-medium">{email}</span>
            </p>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
            Click the link in the email to sign in. It expires in 1 hour.
          </p>
        </div>
        <button
          onClick={() => setSent(false)}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors text-center"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-7">

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Sign in with a magic link — no password needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={error}
          autoComplete="email"
          autoFocus
          required
        />

        <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
          Send Magic Link
        </Button>
      </form>

      <div className="flex flex-col gap-2.5 text-center">
        <Link
          href="/reset-password"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Forgot your password?
        </Link>
        <p className="text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>

    </div>
  )
}

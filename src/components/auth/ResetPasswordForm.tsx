'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ArrowLeft, MailCheck } from 'lucide-react'

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email) { setError('Email is required'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return }

    setLoading(true)
    const supabase = createClient()

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (resetError) {
      toast.error(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  /* ── Success state ─────────────────────────────────────────── */
  if (sent) {
    return (
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <MailCheck className="w-7 h-7 text-orange-400" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Check your inbox</h2>
          <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
            We sent a reset link to{' '}
            <span className="text-zinc-300 font-medium">{email}</span>.
            <br />Check your spam folder if it doesn&apos;t arrive within a minute.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => { setSent(false); setEmail('') }}
          >
            Try a different email
          </Button>
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  /* ── Default state ─────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-8">

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reset your password</h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Enter your email and we&apos;ll send you a secure reset link.
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
        />

        <Button type="submit" loading={loading} size="lg" className="w-full">
          Send reset link
        </Button>
      </form>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </Link>

    </div>
  )
}

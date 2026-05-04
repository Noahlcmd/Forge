'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { getAppUrl } from '@/lib/app-url'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { CheckCircle2 } from 'lucide-react'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One letter', test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
]

export function SignupForm({ next }: { next?: string } = {}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    organizationName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.fullName.trim()) errs.fullName = 'Full name is required'
    if (!form.organizationName.trim()) errs.organizationName = 'Organization name is required'
    if (!form.email) errs.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email address'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Must be at least 8 characters'
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password'
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const supabase = createClient()
    const callbackNext = next ? encodeURIComponent(next) : ''
    const base = getAppUrl()
    const emailRedirectTo = callbackNext
      ? `${base}/auth/callback?next=${callbackNext}`
      : `${base}/auth/callback`

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: form.fullName.trim(),
          organization_name: form.organizationName.trim(),
        },
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Account created! Check your email to confirm.')
    router.push('/login')
  }

  const passwordFocused = touched.password
  const passRules = PASSWORD_RULES.map(r => ({ ...r, met: r.test(form.password) }))

  return (
    <div className="flex flex-col gap-7">

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Start your Forge workspace — free to set up.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Name + Org — single column on mobile, 2 cols on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Full name"
            type="text"
            placeholder="Jane Smith"
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            error={errors.fullName}
            autoComplete="name"
            autoFocus
          />
          <Input
            label="Organization"
            type="text"
            placeholder="Acme Inc."
            value={form.organizationName}
            onChange={e => setForm(f => ({ ...f, organizationName: e.target.value }))}
            error={errors.organizationName}
          />
        </div>

        <Input
          label="Work email"
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          error={errors.email}
          autoComplete="email"
        />

        <div className="flex flex-col gap-1.5">
          <PasswordInput
            label="Password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onFocus={() => setTouched(t => ({ ...t, password: true }))}
            error={errors.password}
            autoComplete="new-password"
          />

          {/* Password strength rules — show once field is touched */}
          {passwordFocused && form.password.length > 0 && (
            <div className="flex gap-3 pt-0.5">
              {passRules.map(({ label, met }) => (
                <div key={label} className="flex items-center gap-1">
                  <CheckCircle2 className={`w-3 h-3 shrink-0 transition-colors ${met ? 'text-green-400' : 'text-zinc-600'}`} />
                  <span className={`text-xs transition-colors ${met ? 'text-zinc-400' : 'text-zinc-600'}`}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <PasswordInput
          label="Confirm password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
          Create account
        </Button>
      </form>

      {/* Terms note */}
      <p className="text-xs text-zinc-600 text-center leading-relaxed">
        By creating an account you agree to our{' '}
        <a href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">Terms of Service</a>
        {' '}and{' '}
        <a href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2">Privacy Policy</a>.
      </p>

      {/* Footer link */}
      <p className="text-center text-sm text-zinc-500 -mt-3">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>

    </div>
  )
}

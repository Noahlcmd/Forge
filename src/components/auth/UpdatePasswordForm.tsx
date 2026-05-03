'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { CheckCircle2, ShieldCheck } from 'lucide-react'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One letter', test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
]

export function UpdatePasswordForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [touched, setTouched] = useState(false)

  function validate() {
    const errs: typeof errors = {}
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
    const { error } = await supabase.auth.updateUser({ password: form.password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Password updated!')
    router.push('/dashboard')
    router.refresh()
  }

  const passRules = PASSWORD_RULES.map(r => ({ ...r, met: r.test(form.password) }))
  const allMet = passRules.every(r => r.met)

  return (
    <div className="flex flex-col gap-8">

      {/* Heading */}
      <div className="flex flex-col gap-4">
        <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Set new password</h1>
          <p className="text-sm text-zinc-500 mt-1.5">
            Choose a strong password to secure your account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <PasswordInput
            label="New password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onFocus={() => setTouched(true)}
            error={errors.password}
            autoComplete="new-password"
            autoFocus
          />

          {/* Strength rules */}
          {(touched || form.password.length > 0) && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {passRules.map(({ label, met }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3 h-3 shrink-0 transition-colors ${met ? 'text-green-400' : 'text-zinc-700'}`} />
                  <span className={`text-xs leading-tight transition-colors ${met ? 'text-zinc-400' : 'text-zinc-600'}`}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <PasswordInput
          label="Confirm new password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          loading={loading}
          size="lg"
          className="w-full mt-2"
          disabled={loading || (touched && !allMet)}
        >
          Update password
        </Button>
      </form>

    </div>
  )
}

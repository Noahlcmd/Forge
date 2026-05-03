'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AppUserProfile, AppUserMembership } from '@/lib/auth/getAppUser'

const INDUSTRIES = [
  'Technology', 'Marketing & Advertising', 'Finance & Accounting',
  'Healthcare', 'Retail & E-commerce', 'Construction & Real Estate',
  'Legal', 'Consulting', 'Education', 'Other',
]
const BUSINESS_TYPES = [
  { value: 'agency',     label: 'Agency'     },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'startup',    label: 'Startup'    },
  { value: 'ecommerce',  label: 'E-commerce' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'other',      label: 'Other'      },
]
const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
]

interface Props {
  profile:    AppUserProfile
  membership: AppUserMembership
}

export function GeneralTab({ profile, membership }: Props) {
  const router     = useRouter()
  const fileRef    = useRef<HTMLInputElement>(null)
  const org        = membership.organizations

  const [fullName,      setFullName]      = useState(profile.full_name ?? '')
  const [orgName,       setOrgName]       = useState(org.name)
  const [industry,      setIndustry]      = useState(org.industry ?? '')
  const [businessType,  setBusinessType]  = useState(org.business_type ?? '')
  const [logoUrl,       setLogoUrl]       = useState(org.logo_url ?? '')
  const [logoName,      setLogoName]      = useState<string | null>(null)
  const [currency,      setCurrency]      = useState((org as unknown as { settings?: { currency?: string } }).settings?.currency ?? 'USD')

  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleLogoUpload(file: File) {
    setUploading(true)
    try {
      const supabase = createClient()
      const path     = `${org.id}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`
      const { error: err } = await supabase.storage.from('org-logos').upload(path, file, { upsert: true })
      if (err) throw err
      const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path)
      setLogoUrl(publicUrl)
      setLogoName(file.name)
    } catch {
      setError('Logo upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      if (fullName !== (profile.full_name ?? '')) {
        const res = await fetch('/api/profile', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ full_name: fullName.trim() || null }),
        })
        if (!res.ok) throw new Error('Failed to update profile')
      }
      const res = await fetch('/api/settings/general', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: orgName.trim(), industry, business_type: businessType, logo_url: logoUrl || null, currency }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Failed to save')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Profile */}
      <Section title="Profile" desc="Update your personal information.">
        <Field label="Full name">
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"
            className="forge-input" />
        </Field>
        <Field label="Email">
          <input value={profile.email} disabled className="forge-input" />
        </Field>
      </Section>

      {/* Organization */}
      <Section title="Organization" desc="Your organization details visible across the platform.">
        <Field label="Organization name">
          <input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Acme Inc."
            className="forge-input" />
        </Field>

        <Field label="Logo">
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
          <div className="flex items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover"
                style={{ border: '1px solid var(--card-border)' }} />
            )}
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-secondary)' }}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {logoName ?? (uploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo')}
            </button>
          </div>
        </Field>

        <Field label="Industry">
          <select value={industry} onChange={e => setIndustry(e.target.value)} className="forge-input">
            <option value="">Select industry…</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </Field>

        <Field label="Business type">
          <select value={businessType} onChange={e => setBusinessType(e.target.value)} className="forge-input">
            <option value="">Select type…</option>
            {BUSINESS_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </Section>

      {/* Currency */}
      <Section title="Currency" desc="Default currency used across finances, ads, and reports.">
        <Field label="Display currency">
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="forge-input" style={{ maxWidth: 240 }}>
            {CURRENCIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </Section>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button onClick={handleSave} disabled={saving}
        className="btn btn-primary"
        style={{ height: 36 }}>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saved  && <Check className="w-3.5 h-3.5" />}
        {saved ? 'Saved' : saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="forge-card p-6 space-y-4">
      <div>
        <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      {children}
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[12px] font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'
import type { OrgTheme, FontOption } from '@/lib/theme'

const MODES = [
  { value: 'dark',   label: 'Dark'   },
  { value: 'light',  label: 'Light'  },
  { value: 'system', label: 'System' },
] as const

const FONTS: { value: FontOption; label: string; preview: string }[] = [
  { value: 'inter',   label: 'Inter',   preview: 'The quick brown fox' },
  { value: 'poppins', label: 'Poppins', preview: 'The quick brown fox' },
  { value: 'roboto',  label: 'Roboto',  preview: 'The quick brown fox' },
  { value: 'system',  label: 'System',  preview: 'The quick brown fox' },
]

const FONT_FAMILY: Record<FontOption, string> = {
  inter:   'var(--font-inter), sans-serif',
  poppins: 'var(--font-poppins), sans-serif',
  roboto:  'var(--font-roboto), sans-serif',
  system:  'system-ui, sans-serif',
}

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444',
  '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#6366f1',
]

interface Props { theme: OrgTheme }

export function AppearanceTab({ theme }: Props) {
  const router = useRouter()

  const [primary, setPrimary] = useState(theme.primaryColor)
  const [mode,    setMode]    = useState<OrgTheme['mode']>(theme.mode)
  const [font,    setFont]    = useState<FontOption>(theme.font ?? 'inter')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function applyColorPreview(color: string) {
    document.documentElement.style.setProperty('--color-primary', color)
    document.documentElement.style.setProperty('--color-accent',  color)
  }

  function applyModeNow(m: OrgTheme['mode']) {
    if (m === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (m === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    }
  }

  function applyFontNow(f: FontOption) {
    document.documentElement.setAttribute('data-font', f)
    document.cookie = `forge-font=${f}; path=/; max-age=31536000; SameSite=Lax`
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/settings/appearance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mode,
          primaryColor: primary,
          accentColor:  primary,
          sidebarStyle: theme.sidebarStyle,
          cardStyle:    theme.cardStyle,
          density:      theme.density,
          font,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Failed to save')
      }
      applyColorPreview(primary)
      applyModeNow(mode)
      applyFontNow(font)
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

      <Section title="Mode" desc="Choose your preferred color scheme.">
        <div className="flex gap-2 flex-wrap">
          {MODES.map(({ value, label }) => (
            <Pill key={value} active={mode === value} onClick={() => { setMode(value); applyModeNow(value) }}>
              {label}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Primary Color" desc="Applies to buttons, active states, and highlights.">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setPrimary(c); applyColorPreview(c) }}
                className="w-8 h-8 rounded-lg transition-all"
                style={{
                  backgroundColor: c,
                  border: primary === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                  transform: primary === c ? 'scale(1.1)' : 'scale(1)',
                  outline: primary === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primary}
              onChange={e => { setPrimary(e.target.value); applyColorPreview(e.target.value) }}
              className="w-10 h-10 rounded-lg cursor-pointer"
              style={{ border: '1px solid var(--card-border)', background: 'var(--input-bg)' }}
            />
            <span className="text-[12px] font-mono" style={{ color: 'var(--text-secondary)' }}>{primary}</span>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Custom color</span>
          </div>
        </div>
      </Section>

      <Section title="Font" desc="Choose the typeface used throughout the app.">
        <div className="grid grid-cols-2 gap-2">
          {FONTS.map(f => (
            <button
              key={f.value}
              onClick={() => { setFont(f.value); applyFontNow(f.value) }}
              className="text-left p-3 rounded-[10px] transition-all"
              style={{
                background:  font === f.value ? 'rgba(249,115,22,0.08)' : 'var(--input-bg)',
                border:      font === f.value ? '1.5px solid var(--color-primary)' : '1.5px solid var(--card-border)',
              }}
            >
              <p className="text-[13px] font-medium mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: FONT_FAMILY[f.value] }}>
                {f.label}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: FONT_FAMILY[f.value] }}>
                {f.preview}
              </p>
            </button>
          ))}
        </div>
      </Section>

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ height: 36 }}>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saved  && <Check  className="w-3.5 h-3.5" />}
        {saved ? 'Saved' : saving ? 'Saving…' : 'Save appearance'}
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

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
      style={{
        background:  active ? 'rgba(249,115,22,0.10)' : 'var(--input-bg)',
        border:      active ? '1px solid var(--color-primary)' : '1px solid var(--card-border)',
        color:       active ? 'var(--color-primary)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  )
}

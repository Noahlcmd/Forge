'use client'

import { useState } from 'react'
import { Loader2, Megaphone, Linkedin, ExternalLink, Sparkles, Target, DollarSign, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const GOALS = [
  { value: 'lead_gen',   label: 'Lead Generation',     desc: 'Capture contact details from prospects' },
  { value: 'sales',      label: 'Sales / Conversions', desc: 'Drive purchases or signups'             },
  { value: 'awareness',  label: 'Brand Awareness',     desc: 'Reach new audiences at scale'           },
  { value: 'engagement', label: 'Engagement',          desc: 'Build community and interaction'        },
]

interface CampaignResult {
  headline:       string
  body:           string
  cta:            string
  platforms:      string[]
  estimatedLeads: number
  costPerLead:    number
  reasoning:      string
}

export function CampaignBuilder() {
  const [audience,  setAudience]  = useState('')
  const [location,  setLocation]  = useState('')
  const [budget,    setBudget]    = useState('')
  const [goal,      setGoal]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [result,    setResult]    = useState<CampaignResult | null>(null)
  const [launching,      setLaunching]      = useState(false)
  const [launched,       setLaunched]       = useState(false)
  const [launchError,    setLaunchError]    = useState<string | null>(null)

  const canGenerate = audience.trim() && location.trim() && budget.trim() && goal

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai/campaign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ audience, location, budget, goal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Generation failed')
      setResult(data as CampaignResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleLaunch() {
    if (!result) return
    setLaunching(true)
    setLaunchError(null)
    try {
      const budgetCents = Math.round(parseFloat(budget) * 100) || 0
      const res = await fetch('/api/campaigns', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:            `${goal} — ${audience.slice(0, 40)}`,
          ad_copy:         `${result.headline}\n\n${result.body}\n\nCTA: ${result.cta}`,
          budget_cents:    budgetCents,
          target_audience: { audience, location, goal, platforms: result.platforms },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Save failed')
      setLaunched(true)
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-6">

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
          <Sparkles className="w-5 h-5 text-pink-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>AI Campaign Builder</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Generate high-converting ad campaigns in seconds</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Input panel */}
        <div className="forge-card p-5 space-y-5">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Campaign details</h3>

          <div>
            <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Users className="w-3.5 h-3.5" />Target audience
            </label>
            <input
              value={audience}
              onChange={e => setAudience(e.target.value)}
              placeholder="e.g. Small business owners aged 30–50 in tech"
              className="forge-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Target className="w-3.5 h-3.5" />Location
            </label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. New York, USA or Global"
              className="forge-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <DollarSign className="w-3.5 h-3.5" />Monthly budget (USD)
            </label>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="e.g. 2000"
              className="forge-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Campaign goal</label>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(({ value, label, desc }) => (
                <button key={value} onClick={() => setGoal(value)}
                  className={cn('text-left p-3 rounded-lg border text-xs transition-all',
                    goal === value
                      ? 'border-orange-400/40'
                      : 'hover:border-gray-300'
                  )}
                  style={goal === value
                    ? { background: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.35)' }
                    : { background: 'var(--surface-subtle)', borderColor: 'var(--card-border)' }
                  }>
                  <p className="font-semibold text-[13px]" style={{ color: goal === value ? 'var(--color-primary)' : 'var(--text-primary)' }}>{label}</p>
                  <p className="mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className="btn btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ height: '40px' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating campaign…' : 'Generate Campaign'}
          </button>
        </div>

        {/* Result panel */}
        <div className={cn('forge-card p-5 transition-all', !result && 'border-dashed')}>
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-64 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
                <Megaphone className="w-6 h-6 text-pink-400" />
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Fill in the details and generate your campaign</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-64 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>AI is crafting your campaign…</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Campaign Preview</h3>
                <div className="flex items-center gap-1.5">
                  {result.platforms.map(p => (
                    <span key={p} className="chip chip-blue">{p}</span>
                  ))}
                </div>
              </div>

              {/* Ad preview */}
              <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}>
                <p className="text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--text-muted)' }}>Sponsored</p>
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{result.headline}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{result.body}</p>
                <button className="mt-2 btn btn-primary btn-sm">{result.cta}</button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Est. Monthly Leads</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{result.estimatedLeads.toLocaleString()}</p>
                </div>
                <div className="rounded-lg p-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Cost Per Lead</p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>${result.costPerLead.toFixed(2)}</p>
                </div>
              </div>

              {/* Reasoning */}
              <div className="rounded-lg p-3" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>AI Reasoning</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{result.reasoning}</p>
              </div>

              {/* Platforms */}
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Recommended platforms</p>
                <div className="flex gap-2 flex-wrap">
                  {result.platforms.map(p => (
                    <div key={p} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}>
                      <Linkedin className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{p}</span>
                      <ExternalLink className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ))}
                </div>
              </div>

              {launchError && (
                <p className="text-xs text-red-500 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {launchError}
                </p>
              )}

              {launched ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: 'rgba(18,161,80,0.08)', border: '1px solid rgba(18,161,80,0.2)' }}>
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <span className="text-xs text-white font-bold">✓</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">Campaign queued for launch</span>
                </div>
              ) : (
                <button
                  onClick={handleLaunch}
                  disabled={launching}
                  className="btn btn-primary w-full justify-center disabled:opacity-50"
                  style={{ height: '40px' }}
                >
                  {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                  {launching ? 'Launching…' : 'Launch Campaign'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

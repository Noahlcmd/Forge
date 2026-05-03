'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, Check, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const OAUTH_PROVIDERS = new Set(['google_calendar'])

const OAUTH_AUTH_URL: Record<string, string> = {
  google_calendar: '/api/integrations/google/auth',
}

type IntegrationRow = {
  id:         string
  provider:   string
  status:     'connected' | 'disconnected'
  metadata:   Record<string, unknown>
  updated_at: string
}

const INTEGRATIONS = [
  {
    provider:    'stripe',
    label:       'Stripe',
    desc:        'Accept payments and manage subscriptions',
    logo:        '💳',
    configField: { key: 'account_id', placeholder: 'Stripe account ID', label: 'Account ID' },
  },
  {
    provider:    'gmail',
    label:       'Gmail',
    desc:        'Send outreach emails from your Gmail account',
    logo:        '📧',
    configField: { key: 'email', placeholder: 'your@gmail.com', label: 'Gmail address' },
  },
  {
    provider:    'slack',
    label:       'Slack',
    desc:        'Get notifications and updates in your Slack workspace',
    logo:        '💬',
    configField: { key: 'webhook_url', placeholder: 'https://hooks.slack.com/…', label: 'Webhook URL' },
  },
  {
    provider:    'google_ads',
    label:       'Google Ads',
    desc:        'Sync and manage your Google Ads campaigns',
    logo:        '🔵',
    configField: { key: 'customer_id', placeholder: 'Google Ads customer ID', label: 'Customer ID' },
  },
  {
    provider:    'meta_ads',
    label:       'Meta Ads',
    desc:        'Connect Facebook and Instagram ad campaigns',
    logo:        '🟦',
    configField: { key: 'ad_account_id', placeholder: 'Meta ad account ID', label: 'Ad Account ID' },
  },
  {
    provider:    'linkedin_ads',
    label:       'LinkedIn Ads',
    desc:        'Manage LinkedIn advertising campaigns',
    logo:        '🔷',
    configField: { key: 'account_id', placeholder: 'LinkedIn account ID', label: 'Account ID' },
  },
  {
    provider:    'tiktok_ads',
    label:       'TikTok Ads',
    desc:        'Connect your TikTok for Business account',
    logo:        '🎵',
    configField: { key: 'advertiser_id', placeholder: 'TikTok advertiser ID', label: 'Advertiser ID' },
  },
  {
    provider:    'shopify',
    label:       'Shopify',
    desc:        'Sync orders, customers, and products from Shopify',
    logo:        '🛍️',
    configField: { key: 'shop_domain', placeholder: 'yourstore.myshopify.com', label: 'Shop domain' },
  },
  {
    provider:    'webhook',
    label:       'Webhooks',
    desc:        'Send real-time event data to any endpoint',
    logo:        '🔗',
    configField: { key: 'endpoint_url', placeholder: 'https://your-endpoint.com/hook', label: 'Endpoint URL' },
  },
  {
    provider:    'google_calendar',
    label:       'Google Calendar',
    desc:        'Sync events and schedule meetings',
    logo:        '📅',
    configField: { key: 'calendar_id', placeholder: 'Google Calendar ID', label: 'Calendar ID' },
  },
  {
    provider:    'apollo',
    label:       'Apollo.io',
    desc:        'Find and enrich leads automatically',
    logo:        '🚀',
    configField: { key: 'api_key', placeholder: 'Apollo API key', label: 'API Key' },
  },
] as const

type Provider = typeof INTEGRATIONS[number]['provider']

export function IntegrationsTab() {
  const [rows,      setRows]      = useState<IntegrationRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving,    setSaving]    = useState<string | null>(null)
  const [open,      setOpen]      = useState<string | null>(null)
  const [value,     setValue]     = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [query,     setQuery]     = useState('')

  useEffect(() => {
    fetch('/api/settings/integrations')
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error((d as { error?: string }).error ?? 'Failed to load')
        if (Array.isArray(d)) setRows(d)
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Failed to load integrations.'))
      .finally(() => setLoading(false))

    // Show toast for OAuth result
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'google_calendar') {
      toast.success('Google Calendar connected')
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
    } else if (params.get('error')) {
      const msg = params.get('error') ?? 'Connection failed'
      toast.error(msg.replace(/_/g, ' '))
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
    }
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return INTEGRATIONS
    const q = query.toLowerCase()
    return INTEGRATIONS.filter(i => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q))
  }, [query])

  function statusFor(provider: string) {
    return rows.find(r => r.provider === provider)?.status ?? 'disconnected'
  }
  function metaFor(provider: string): Record<string, unknown> {
    return rows.find(r => r.provider === provider)?.metadata ?? {}
  }

  async function connect(provider: Provider) {
    if (!value.trim()) return
    setSaving(provider)
    setError(null)
    const cfg = INTEGRATIONS.find(i => i.provider === provider)!
    try {
      const res = await fetch('/api/settings/integrations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          provider,
          status:   'connected',
          metadata: { ...metaFor(provider), [cfg.configField.key]: value.trim() },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to save')
      setRows(prev => [...prev.filter(r => r.provider !== provider), data as IntegrationRow])
      setOpen(null)
      setValue('')
      toast.success(`${INTEGRATIONS.find(i => i.provider === provider)?.label ?? provider} connected`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(null)
    }
  }

  async function disconnect(provider: string) {
    setSaving(provider)
    setError(null)
    try {
      const res = await fetch('/api/settings/integrations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ provider, status: 'disconnected', metadata: {} }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed')
      setRows(prev => [...prev.filter(r => r.provider !== provider), data as IntegrationRow])
      toast.success(`${INTEGRATIONS.find(i => i.provider === provider)?.label ?? provider} disconnected`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="forge-card flex items-center gap-3 p-4" style={{ borderColor: '#fecaca' }}>
        <span className="text-[13px] text-red-500 flex-1">{loadError}</span>
        <button onClick={() => window.location.reload()} className="text-[12px] underline shrink-0"
          style={{ color: 'var(--text-muted)' }}>Retry</button>
      </div>
    )
  }

  const connectedCount = INTEGRATIONS.filter(i => statusFor(i.provider) === 'connected').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {connectedCount} of {INTEGRATIONS.length} connected
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search integrations…"
          className="forge-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {error && (
        <p className="text-[13px] text-red-500 px-3 py-2 rounded-[10px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </p>
      )}

      {/* Grid */}
      <div className="grid gap-3">
        {filtered.map(({ provider, label, desc, logo, configField }) => {
          const connected = statusFor(provider) === 'connected'
          const isSaving  = saving === provider
          const isOpen    = open   === provider
          const meta      = metaFor(provider)
          const currentVal = (meta[configField.key] as string | undefined) ?? ''

          return (
            <div key={provider} className="forge-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-xl shrink-0"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                    {logo}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>{label}</p>
                      {connected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-[500] px-1.5 py-[2px] rounded-full"
                          style={{ background: '#e8f7ee', color: '#12a150', border: '1px solid #bbf7d0' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                    {connected && (currentVal || !!meta['email']) && (
                      <p className="text-[11px] mt-1 font-mono truncate max-w-[200px]"
                        style={{ color: 'var(--text-secondary)' }}>
                        {(meta['email'] as string | undefined) ?? currentVal}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {connected ? (
                    <button
                      onClick={() => disconnect(provider)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[12px] font-[500] transition-all disabled:opacity-50"
                      style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      Disconnect
                    </button>
                  ) : OAUTH_PROVIDERS.has(provider) ? (
                    <a
                      href={OAUTH_AUTH_URL[provider] ?? `/api/integrations/${provider}/auth`}
                      className="flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[12px] font-[500] text-white transition-all"
                      style={{ background: 'var(--color-primary)', textDecoration: 'none' }}
                    >
                      <Check className="w-3 h-3" />
                      Connect with Google
                    </a>
                  ) : (
                    <button
                      onClick={() => { setOpen(isOpen ? null : provider); setValue(currentVal); setError(null) }}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-[6px] rounded-[8px] text-[12px] font-[500] text-white transition-all disabled:opacity-50"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {isOpen && !connected && (
                <div className="flex items-end gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
                  <div className="flex-1">
                    <label className="text-[11px] font-[500] block mb-1" style={{ color: 'var(--text-muted)' }}>
                      {configField.label}
                    </label>
                    <input
                      value={value}
                      onChange={e => setValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && connect(provider as Provider)}
                      placeholder={configField.placeholder}
                      className="forge-input text-[13px]"
                    />
                  </div>
                  <button
                    onClick={() => connect(provider as Provider)}
                    disabled={!value.trim() || isSaving}
                    className="flex items-center gap-1.5 px-3 py-[7px] rounded-[8px] text-[12px] font-[500] text-white disabled:opacity-40 transition-all shrink-0"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                  <button
                    onClick={() => { setOpen(null); setValue('') }}
                    className="px-3 py-[7px] rounded-[8px] text-[12px] transition-colors shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <p className="text-center py-8 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            No integrations match &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Bell, HelpCircle, Search, Users, Target, Megaphone, Loader2, CheckCheck } from 'lucide-react'
import type { AppUserProfile } from '@/lib/auth/getAppUser'
import type { SearchResponse, SearchResult } from '@/app/api/search/route'
import type { Notification } from '@/app/api/notifications/route'

interface TopbarProps {
  profile:      Pick<AppUserProfile, 'full_name' | 'email'> | null
  orgName:      string
  unreadCount?: number
}

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/customers':        'Customers',
  '/leads':            'Potential Clients',
  '/finding-clients':  'Finding Clients',
  '/outreach':         'Outreach',
  '/finances':         'Finances',
  '/calendar':         'Calendar',
  '/chat':             'Chat',
  '/ads':              'Ads Manager',
  '/workspace':        'Workspace',
  '/settings':         'Settings',
  '/billing':          'Billing',
  '/team':             'Team',
  '/reports':          'Reports & Insights',
}

function getLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  for (const [prefix, label] of Object.entries(ROUTE_LABELS)) {
    if (pathname.startsWith(prefix + '/')) return label
  }
  return 'Dashboard'
}

const TYPE_ICON: Record<string, React.ElementType> = {
  customer: Users,
  lead:     Target,
  campaign: Megaphone,
}

const TYPE_COLOR: Record<string, string> = {
  customer: '#2563eb',
  lead:     '#7c3aed',
  campaign: '#db2777',
}

const TYPE_BG: Record<string, string> = {
  customer: '#eff6ff',
  lead:     '#f5f3ff',
  campaign: '#fdf2f8',
}

function flattenResults(results: SearchResponse): SearchResult[] {
  return [...results.customers, ...results.leads, ...results.campaigns]
}

export function Topbar({ profile, orgName, unreadCount: initialUnread = 0 }: TopbarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const label     = getLabel(pathname)

  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<SearchResponse | null>(null)
  const [searching,  setSearching]  = useState(false)
  const [open,       setOpen]       = useState(false)
  const [activeIdx,  setActiveIdx]  = useState(-1)

  // Notifications
  const [bellOpen,       setBellOpen]       = useState(false)
  const [notifications,  setNotifications]  = useState<Notification[]>([])
  const [unreadCount,    setUnreadCount]    = useState(initialUnread)
  const [notifLoading,   setNotifLoading]   = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  const initials = ((profile?.full_name ?? profile?.email) || 'U')
    .split(/[\s@]/)
    .filter(Boolean)
    .map((n: string) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = query.trim()
    if (!q || q.length < 2) {
      setResults(null)
      setOpen(false)
      setActiveIdx(-1)
      return
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json() as SearchResponse
        setResults(data)
        setOpen(true)
        setActiveIdx(-1)
      } catch {
        // silent
      } finally {
        setSearching(false)
      }
    }, 350)
  }, [query])

  // Close search on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close bell on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function openBell() {
    setBellOpen(v => !v)
    if (!bellOpen) {
      setNotifLoading(true)
      try {
        const [notifRes] = await Promise.all([
          fetch('/api/notifications'),
          fetch('/api/notifications', { method: 'PATCH' }),
        ])
        const data = await notifRes.json() as Notification[]
        setNotifications((Array.isArray(data) ? data : []).map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      } finally {
        setNotifLoading(false)
      }
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markOneRead(n: Notification) {
    setBellOpen(false)
    if (!n.read) {
      await fetch('/api/notifications', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: n.id }),
      })
    }
    if (n.link) router.push(n.link)
  }

  const allItems = results ? flattenResults(results) : []
  const total    = allItems.length

  const navigate = useCallback((item: SearchResult) => {
    router.push(item.route)
    setOpen(false)
    setQuery('')
    setResults(null)
  }, [router])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, total - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && activeIdx < total) {
        navigate(allItems[activeIdx])
      }
    }
  }

  const hasAny = total > 0
  const isEmpty = results !== null && !searching && !hasAny

  return (
    <header
      className="flex items-center gap-3 px-5 shrink-0"
      style={{
        height: 52,
        background: 'var(--topbar-bg, #ffffff)',
        borderBottom: '1px solid var(--topbar-border, #f0f0f0)',
      }}
    >
      {/* Breadcrumb */}
      <span
        className="text-[14px] font-[500] whitespace-nowrap"
        style={{ color: 'var(--text-primary, #0d0e12)' }}
      >
        {label}
      </span>

      {/* Search */}
      <div ref={containerRef} className="relative flex-1 max-w-[380px] ml-4">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 z-10"
          style={{ color: 'var(--text-muted, #9ca3af)' }}
        />
        {searching && (
          <Loader2
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin z-10"
            style={{ color: 'var(--text-muted)' }}
          />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results && total > 0) setOpen(true) }}
          placeholder="Search customers, leads, campaigns…"
          className="forge-input pl-8 pr-8 text-[13px] w-full"
          autoComplete="off"
        />

        {/* Dropdown */}
        {open && (
          <div
            className="absolute top-full mt-1 w-full rounded-[12px] border overflow-hidden z-50"
            style={{
              background: 'var(--card-bg, #fff)',
              borderColor: 'var(--card-border, #eaedf2)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            {isEmpty ? (
              <div className="px-4 py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <>
                {(
                  [
                    { key: 'customers', label: 'Customers', items: results?.customers ?? [] },
                    { key: 'leads',     label: 'Leads',     items: results?.leads     ?? [] },
                    { key: 'campaigns', label: 'Campaigns', items: results?.campaigns ?? [] },
                  ] as const
                ).map(section => {
                  if (section.items.length === 0) return null
                  return (
                    <div key={section.key}>
                      <p
                        className="px-3 pt-2 pb-1 text-[10px] font-[600] uppercase tracking-[0.06em]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {section.label}
                      </p>
                      {section.items.map(item => {
                        const globalIdx = allItems.indexOf(item)
                        const isActive  = globalIdx === activeIdx
                        const Icon      = TYPE_ICON[item.type] ?? Users
                        return (
                          <button
                            key={item.id}
                            onMouseDown={e => { e.preventDefault(); navigate(item) }}
                            onMouseEnter={() => setActiveIdx(globalIdx)}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors"
                            style={{
                              background: isActive ? 'var(--content-bg, #f7f8fa)' : 'transparent',
                            }}
                          >
                            <div
                              className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0"
                              style={{ background: TYPE_BG[item.type], color: TYPE_COLOR[item.type] }}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-[500] truncate" style={{ color: 'var(--text-primary)' }}>
                                {item.name}
                              </p>
                              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                                {item.sub}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
                <div
                  className="px-3 py-2 text-[11px] border-t"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}
                >
                  {total} result{total === 1 ? '' : 's'} — press Enter to navigate
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-[5px] text-[12px] rounded-[10px] border"
          style={{
            color: 'var(--text-secondary)',
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
          }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#12a150' }} />
          <span className="whitespace-nowrap max-w-[120px] truncate">{orgName}</span>
        </div>

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={openBell}
            className="relative w-[34px] h-[34px] rounded-[10px] border flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-[700] text-white px-[3px]"
                style={{ background: '#ef4444' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-[320px] rounded-[12px] border overflow-hidden z-50"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <span className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                  Notifications
                </span>
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[320px] overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-center py-10 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    No notifications yet
                  </p>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => markOneRead(n)}
                      className="flex items-start gap-3 w-full px-4 py-3 text-left border-b last:border-0 transition-colors"
                      style={{
                        borderColor: 'var(--card-border)',
                        background: n.read ? 'transparent' : 'var(--surface-subtle)',
                      }}
                    >
                      {!n.read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: '#6b7cff' }} />
                      )}
                      {n.read && <span className="mt-1.5 w-2 h-2 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-[13px] font-[500] truncate" style={{ color: 'var(--text-primary)' }}>
                          {n.title}
                        </p>
                        {n.description && (
                          <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {n.description}
                          </p>
                        )}
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                          {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <a
          href="/settings"
          className="w-[34px] h-[34px] rounded-[10px] border flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-secondary)', borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          title="Settings"
        >
          <HelpCircle className="w-4 h-4" />
        </a>

        <div
          className="w-[32px] h-[32px] rounded-full flex items-center justify-center cursor-pointer text-[11px] font-[600] text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
          title={profile?.full_name ?? profile?.email ?? 'User'}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}

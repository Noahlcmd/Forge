'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, Loader2, CheckCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Notification = {
  id:          string
  title:       string
  description: string | null
  link:        string | null
  read:        boolean
  created_at:  string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NotificationBell() {
  const [open,    setOpen]    = useState(false)
  const [notifs,  setNotifs]  = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [marking, setMarking] = useState(false)
  const ref    = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef   = useRef<HTMLButtonElement>(null)

  const unread = notifs.filter(n => !n.read).length

  const fetchNotifs = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/notifications')
      const data = await res.json()
      if (res.ok && Array.isArray(data)) setNotifs(data as Notification[])
    } catch { /* swallow */ } finally { setLoading(false) }
  }, [])

  // Poll every 30 seconds
  useEffect(() => {
    fetchNotifs()
    const id = setInterval(fetchNotifs, 30000)
    return () => clearInterval(id)
  }, [fetchNotifs])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current   && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function markAllRead() {
    setMarking(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    } catch { /* swallow */ } finally { setMarking(false) }
  }

  async function markOneRead(id: string) {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch { /* swallow */ }
  }

  function handleClick(n: Notification) {
    if (!n.read) markOneRead(n.id)
    if (n.link) ref.push(n.link)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => { setOpen(v => !v); if (!open) fetchNotifs() }}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--surface-subtle)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-[700] text-white"
            style={{ background: 'var(--color-primary, #f97316)' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-10 w-[340px] rounded-[14px] shadow-xl z-50 overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>Notifications</p>
              {unread > 0 && (
                <span className="text-[10px] font-[700] px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--color-primary, #f97316)' }}>
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={marking}
                  className="flex items-center gap-1 text-[11px] transition-colors"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {marking ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
            {loading && notifs.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
              </div>
            ) : (
              notifs.map((n, i) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
                  style={{
                    background:   !n.read ? 'var(--surface-subtle)' : 'transparent',
                    borderBottom: i < notifs.length - 1 ? '1px solid var(--card-border)' : undefined,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.background = !n.read ? 'var(--surface-subtle)' : 'transparent')}
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: !n.read ? 'var(--color-primary, #f97316)' : 'transparent' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[500] leading-snug" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                    {n.description && (
                      <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{n.description}</p>
                    )}
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

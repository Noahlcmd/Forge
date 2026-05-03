'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Plus, Hash, X, Loader2, MoreVertical, Pin, PinOff, LogOut, Trash2 } from 'lucide-react'

type Channel = {
  id:          string
  name:        string
  slug:        string
  description: string | null
  is_default:  boolean
  is_pinned:   boolean
}

type Message = {
  id:         string
  content:    string
  created_at: string
  user_id:    string
  profiles:   { full_name: string | null; email: string; avatar_url: string | null } | null
}

type DefaultChannel = { name: string; slug: string; description: string }

interface Props {
  initialChannels: Channel[]
  currentUser:     { id: string; full_name: string | null; email: string }
  userRole:        string
  orgId:           string
  defaultChannels: DefaultChannel[]
}

function initials(name: string | null | undefined, email: string) {
  const src = name ?? email
  return src.split(/[\s@.]/).map((n: string) => n[0] ?? '').slice(0, 2).join('').toUpperCase() || 'U'
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const AVATAR_COLORS = ['#6b7cff', '#12a150', '#f97316', '#e53e3e', '#8b5cf6', '#0891b2']
function avatarColor(userId: string) {
  let hash = 0
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

export function ChatClient({ initialChannels, currentUser, userRole, orgId, defaultChannels }: Props) {
  const [channels,      setChannels]      = useState<Channel[]>(initialChannels)
  const [activeChannel, setActiveChannel] = useState<Channel | null>(initialChannels[0] ?? null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [msgError,      setMsgError]      = useState<string | null>(null)
  const [creating,      setCreating]      = useState(false)
  const [newChanName,   setNewChanName]   = useState('')
  const [creatingChan,  setCreatingChan]  = useState(false)
  const [chanError,     setChanError]     = useState<string | null>(null)
  const [provisioned,   setProvisioned]   = useState(false)
  const [menuOpenId,    setMenuOpenId]    = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const menuRef        = useRef<HTMLDivElement>(null)

  const isAdmin = ['owner', 'admin'].includes(userRole)

  // Close 3-dot menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Provision default channels if none exist
  useEffect(() => {
    if (channels.length > 0 || provisioned) return
    setProvisioned(true)
    void (async () => {
      const results: Channel[] = []
      for (const dc of defaultChannels) {
        try {
          const res = await fetch('/api/chat/channels', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name: dc.name, slug: dc.slug, description: dc.description }),
          })
          if (res.ok) {
            const ch = await res.json() as Channel
            results.push(ch)
          }
        } catch { /* noop */ }
      }
      if (results.length > 0) {
        setChannels(results)
        setActiveChannel(results[0] ?? null)
      }
    })()
  }, [channels.length, provisioned, defaultChannels])

  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?channel_id=${channelId}`)
      if (res.ok) {
        const data = await res.json() as Message[]
        setMessages(data)
      }
    } catch { /* noop */ }
  }, [])

  useEffect(() => {
    if (!activeChannel) return
    setLoadingMsgs(true)
    setMsgError(null)
    fetchMessages(activeChannel.id).then(() => setLoadingMsgs(false))

    pollRef.current = setInterval(() => {
      if (activeChannel) fetchMessages(activeChannel.id)
    }, 4000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [activeChannel, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || sending || !activeChannel) return
    setSending(true)
    setMsgError(null)
    const text = input.trim()
    setInput('')
    try {
      const res = await fetch('/api/chat/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ channel_id: activeChannel.id, content: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to send')
      setMessages(prev => [...prev, data as Message])
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  async function createChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!newChanName.trim() || creatingChan) return
    setCreatingChan(true)
    setChanError(null)
    try {
      const res = await fetch('/api/chat/channels', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newChanName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to create')
      const ch = data as Channel
      setChannels(prev => [...prev, ch])
      setActiveChannel(ch)
      setNewChanName('')
      setCreating(false)
    } catch (e) {
      setChanError(e instanceof Error ? e.message : 'Error')
    } finally {
      setCreatingChan(false)
    }
  }

  async function togglePin(ch: Channel) {
    setActionLoading(`pin-${ch.id}`)
    setMenuOpenId(null)
    try {
      const res = await fetch(`/api/chat/channels/${ch.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_pinned: !ch.is_pinned }),
      })
      if (res.ok) {
        const updated = await res.json() as Channel
        setChannels(prev => {
          const next = prev.map(c => c.id === ch.id ? { ...c, is_pinned: updated.is_pinned } : c)
          // Re-sort: pinned first
          return [...next].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
        })
        if (activeChannel?.id === ch.id) {
          setActiveChannel(prev => prev ? { ...prev, is_pinned: updated.is_pinned } : prev)
        }
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function leaveChannel(ch: Channel) {
    setActionLoading(`leave-${ch.id}`)
    setMenuOpenId(null)
    try {
      const res = await fetch(`/api/chat/channels/${ch.id}/leave`, { method: 'POST' })
      if (res.ok) {
        const remaining = channels.filter(c => c.id !== ch.id)
        setChannels(remaining)
        if (activeChannel?.id === ch.id) {
          setActiveChannel(remaining[0] ?? null)
          setMessages([])
        }
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function deleteChannel(ch: Channel) {
    if (!confirm(`Delete #${ch.name}? All messages will be lost.`)) return
    setActionLoading(`delete-${ch.id}`)
    setMenuOpenId(null)
    try {
      const res = await fetch(`/api/chat/channels/${ch.id}`, { method: 'DELETE' })
      if (res.ok) {
        const remaining = channels.filter(c => c.id !== ch.id)
        setChannels(remaining)
        if (activeChannel?.id === ch.id) {
          setActiveChannel(remaining[0] ?? null)
          setMessages([])
        }
      }
    } finally {
      setActionLoading(null)
    }
  }

  const myInitials = initials(currentUser.full_name, currentUser.email)

  return (
    <div className="flex h-[calc(100vh-52px)] overflow-hidden">

      {/* Channel sidebar */}
      <div
        className="w-[220px] shrink-0 flex flex-col overflow-hidden"
        style={{ borderRight: '1px solid var(--card-border)', background: 'var(--surface-subtle)' }}
      >
        <div className="px-3 py-3">
          <input
            type="text"
            placeholder="🔍 Search messages…"
            className="w-full px-3 py-[6px] text-[12px] rounded-[8px] border outline-none"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
          />
        </div>

        <p className="px-4 py-2 text-[10px] font-[600] uppercase tracking-[0.07em]" style={{ color: 'var(--text-muted)' }}>
          Team Chats
        </p>

        <div className="flex-1 overflow-y-auto" ref={menuRef}>
          {channels.map(ch => {
            const isActive  = activeChannel?.id === ch.id
            const isMenuOpen = menuOpenId === ch.id
            const loading   = actionLoading?.startsWith(`pin-${ch.id}`) || actionLoading?.startsWith(`leave-${ch.id}`) || actionLoading?.startsWith(`delete-${ch.id}`)
            return (
              <div key={ch.id} className="relative group">
                <button
                  onClick={() => setActiveChannel(ch)}
                  className="w-full flex items-center gap-2 px-4 py-[7px] pr-8 text-left text-[13px] transition-colors hover:bg-black/5"
                  style={
                    isActive
                      ? { background: 'var(--color-primary-alpha, #eef0ff)', color: 'var(--color-primary, #4f5fd4)' }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  {ch.is_pinned
                    ? <Pin className="w-3 h-3 shrink-0" style={{ color: 'var(--color-primary, #f97316)', opacity: 0.8 }} />
                    : <Hash className="w-3.5 h-3.5 shrink-0" style={{ opacity: 0.6 }} />
                  }
                  <span className="truncate flex-1">{ch.name}</span>
                </button>

                {/* 3-dot menu trigger */}
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : ch.id) }}
                  disabled={!!loading}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {loading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <MoreVertical className="w-3.5 h-3.5" />
                  }
                </button>

                {/* Dropdown menu */}
                {isMenuOpen && (
                  <div
                    className="absolute left-2 z-50 w-44 rounded-[8px] py-1 shadow-lg"
                    style={{
                      top: '100%',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <button
                      onClick={() => togglePin(ch)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors hover:bg-black/5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {ch.is_pinned
                        ? <><PinOff className="w-3.5 h-3.5" /> Unpin</>
                        : <><Pin    className="w-3.5 h-3.5" /> Pin to top</>
                      }
                    </button>
                    <button
                      onClick={() => leaveChannel(ch)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors hover:bg-black/5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <LogOut className="w-3.5 h-3.5" /> Leave channel
                    </button>
                    {isAdmin && (
                      <>
                        <div style={{ borderTop: '1px solid var(--card-border)', margin: '4px 0' }} />
                        <button
                          onClick={() => deleteChannel(ch)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors hover:bg-red-50"
                          style={{ color: '#e53e3e' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete channel
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--card-border)' }}>
          {creating ? (
            <form onSubmit={createChannel} className="space-y-2">
              <input
                value={newChanName}
                onChange={e => setNewChanName(e.target.value)}
                placeholder="Channel name"
                autoFocus
                className="w-full px-2 py-[5px] text-[12px] rounded-[6px] border outline-none"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
              />
              {chanError && <p className="text-[11px]" style={{ color: '#e53e3e' }}>{chanError}</p>}
              <div className="flex gap-1">
                <button
                  type="submit"
                  disabled={creatingChan}
                  className="flex-1 py-[5px] text-[12px] rounded-[6px] text-white font-[500] disabled:opacity-60"
                  style={{ background: 'var(--color-primary, #f97316)' }}
                >
                  {creatingChan ? '…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setChanError(null) }}
                  className="px-2 py-[5px] rounded-[6px] border text-[12px]"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-1.5 py-[6px] rounded-[6px] border text-[12px] font-[500] transition-all"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)', background: 'var(--card-bg)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Channel
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
        {activeChannel ? (
          <>
            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--card-border)' }}
            >
              <Hash className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                  {activeChannel.name}
                  {activeChannel.is_pinned && (
                    <Pin className="inline w-3 h-3 ml-1.5 mb-0.5" style={{ color: 'var(--color-primary, #f97316)' }} />
                  )}
                </p>
                {activeChannel.description && (
                  <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{activeChannel.description}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
              {loadingMsgs && messages.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Hash className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>
                    #{activeChannel.name}
                  </p>
                  <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    Start the conversation. Messages are stored and visible to the whole team.
                  </p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe    = msg.user_id === currentUser.id
                  const name    = msg.profiles?.full_name ?? msg.profiles?.email ?? 'Unknown'
                  const msgInit = initials(msg.profiles?.full_name, msg.profiles?.email ?? '')
                  const bgColor = avatarColor(msg.user_id)
                  return (
                    <div key={msg.id} className={`flex gap-2.5 items-start ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-[600] text-white mt-[2px]"
                        style={{ background: isMe ? 'linear-gradient(135deg, #667eea, #764ba2)' : bgColor }}
                      >
                        {isMe ? myInitials : msgInit}
                      </div>
                      <div className={isMe ? 'items-end flex flex-col' : ''}>
                        <p className="text-[11px] mb-[3px]" style={{ color: 'var(--text-muted)', textAlign: isMe ? 'right' : 'left' }}>
                          {isMe ? 'You' : name} · {fmtTime(msg.created_at)}
                        </p>
                        <div
                          className="max-w-[65%] px-3.5 py-2 text-[13px] leading-[1.5] rounded-[12px]"
                          style={
                            isMe
                              ? { background: 'var(--color-primary, #f97316)', color: '#fff', borderRadius: '12px 4px 12px 12px' }
                              : { background: 'var(--surface-subtle)', color: 'var(--text-primary)', borderRadius: '4px 12px 12px 12px' }
                          }
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {msgError && (
              <div className="px-5 py-2 text-[12px]" style={{ background: '#fff0f0', color: '#e53e3e', borderTop: '1px solid #fecaca' }}>
                {msgError}
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={sendMessage}
              className="flex items-center gap-2 px-4 py-3 shrink-0"
              style={{ borderTop: '1px solid var(--card-border)' }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Message #${activeChannel.slug}…`}
                className="flex-1 px-4 py-2.5 text-[13px] rounded-[14px] border outline-none"
                style={{
                  borderColor: 'var(--card-border)',
                  background:  'var(--surface-subtle)',
                  color:       'var(--text-primary)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary, #f97316)'; e.currentTarget.style.background = 'var(--card-bg)' }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.background = 'var(--surface-subtle)' }}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--color-primary, #f97316)' }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Hash className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[14px] font-[500]" style={{ color: 'var(--text-primary)' }}>No channels yet</p>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{'Click "New Channel" to get started.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

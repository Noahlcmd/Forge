'use client'

import { useState } from 'react'
import { Users, Shield, Plus, X, RefreshCw, Trash2, Clock, CheckCircle2, AlertCircle, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  id:          string
  role:        string
  accepted_at: string | null
  user_id:     string
  profiles:    { full_name: string | null; email: string; avatar_url: string | null } | null
}

type Invite = {
  id:         string
  email:      string
  role:        string
  expires_at: string
  created_at: string
  profiles:   { full_name: string | null; email: string } | null
}

interface Props {
  members:       Member[]
  invites:       Invite[]
  currentUserId: string
  currentRole:   string
  orgId:         string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROLE_CHIP: Record<string, { bg: string; color: string }> = {
  owner:    { bg: '#eef0ff', color: '#4f5fd4' },
  admin:    { bg: '#eff6ff', color: '#2563eb' },
  employee: { bg: '#f3f4f6', color: '#6b7280' },
}

const MODULES = ['Customers', 'Finances', 'Potential Clients', 'Reports', 'Team Settings', 'Ads Manager']
const ROLES   = ['owner', 'admin', 'employee']

const ROLE_DEFAULT_PERMS: Record<string, boolean[]> = {
  owner:    [true,  true,  true,  true,  true,  true],
  admin:    [true,  true,  true,  true,  true,  true],
  employee: [true,  false, true,  false, false, true],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return (name || 'U').split(' ').map((n: string) => n[0] ?? '').slice(0, 2).join('').toUpperCase() || 'U'
}

function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function expiresIn(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'Expires in < 1h'
  return `Expires in ${h}h`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamClient({ members, invites: initialInvites, currentUserId, currentRole, orgId }: Props) {
  const [tab,      setTab]      = useState<'members' | 'invites' | 'permissions'>('members')
  const [inviting, setInviting] = useState(false)
  const [email,    setEmail]    = useState('')
  const [role,     setRole]     = useState('employee')
  const [loading,  setLoading]  = useState(false)
  const [invites,  setInvites]  = useState<Invite[]>(initialInvites)
  const [perms,    setPerms]    = useState<Record<string, boolean[]>>(() => {
    const out: Record<string, boolean[]> = {}
    ROLES.forEach(r => { out[r] = [...(ROLE_DEFAULT_PERMS[r] ?? [])] })
    return out
  })

  // action state per invite id
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [inviteLink,    setInviteLink]    = useState<string | null>(null)

  const canManage = currentRole === 'owner' || currentRole === 'admin'
  const active    = members.filter(m =>  m.accepted_at)
  const pending   = members.filter(m => !m.accepted_at)

  // ── Invite form ──────────────────────────────────────────────────────────────

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return
    setLoading(true)
    setInviteLink(null)
    try {
      const res  = await fetch('/api/team/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), role }),
      })
      const data = await res.json() as { error?: string; inviteLink?: string; emailSent?: boolean }
      if (!res.ok) throw new Error(data.error ?? 'Failed to send invite')

      if (data.emailSent) {
        toast.success(`Invite sent to ${email.trim()}`)
      } else if (data.inviteLink) {
        setInviteLink(data.inviteLink)
        toast('Email not configured — copy the link below', { icon: '⚠️' })
      }

      setEmail('')
      setInviting(false)
      // Refresh invite list
      const listRes  = await fetch('/api/team/invites')
      if (listRes.ok) setInvites(await listRes.json() as Invite[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // ── Revoke ───────────────────────────────────────────────────────────────────

  async function handleRevoke(id: string, invEmail: string) {
    setActionLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res  = await fetch(`/api/team/invites/${id}`, { method: 'DELETE' })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to revoke')
      setInvites(prev => prev.filter(inv => inv.id !== id))
      toast.success(`Invite to ${invEmail} revoked`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to revoke invite')
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  // ── Resend ───────────────────────────────────────────────────────────────────

  async function handleResend(id: string, invEmail: string) {
    setActionLoading(prev => ({ ...prev, [id + '-resend']: true }))
    try {
      const res  = await fetch(`/api/team/invites/${id}/resend`, { method: 'POST' })
      const data = await res.json() as { error?: string; inviteLink?: string; emailSent?: boolean }
      if (!res.ok) throw new Error(data.error ?? 'Failed to resend')

      if (data.emailSent) {
        toast.success(`Invite resent to ${invEmail}`)
      } else if (data.inviteLink) {
        setInviteLink(data.inviteLink)
        toast('Email not configured — copy the link below', { icon: '⚠️' })
      }
      // Refresh list (new token)
      const listRes = await fetch('/api/team/invites')
      if (listRes.ok) setInvites(await listRes.json() as Invite[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to resend invite')
    } finally {
      setActionLoading(prev => ({ ...prev, [id + '-resend']: false }))
    }
  }

  // ── Permissions toggle ───────────────────────────────────────────────────────

  function togglePerm(role: string, idx: number) {
    if (role === 'owner') return
    setPerms(prev => {
      const next = { ...prev, [role]: [...(prev[role] ?? [])] }
      next[role]![idx] = !next[role]![idx]
      return next
    })
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const tabCount: Record<string, number | undefined> = {
    members:     active.length,
    invites:     invites.length || undefined,
    permissions: undefined,
  }

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text-primary)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
            Team
          </h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            {active.length} active member{active.length !== 1 ? 's' : ''}
            {invites.length > 0 && ` · ${invites.length} pending invite${invites.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManage && !inviting && (
          <button
            onClick={() => { setInviting(true); setInviteLink(null) }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-[500] text-white"
            style={{ background: 'var(--color-primary, #f97316)' }}
          >
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* ── Invite form ────────────────────────────────────────────────────── */}
      {inviting && (
        <div className="forge-card" style={{ padding: 20 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] font-[600]">Invite Team Member</p>
            <button onClick={() => { setInviting(false); setInviteLink(null) }}>
              <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
          <form onSubmit={handleInvite} className="flex gap-3 flex-wrap">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
              className="flex-1 min-w-[200px] px-3 py-2 text-[13px] rounded-[8px] border outline-none"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="px-3 py-2 text-[13px] rounded-[8px] border outline-none"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
            >
              <option value="employee">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-[13px] font-[500] rounded-[8px] text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary, #f97316)' }}
            >
              {loading ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
        </div>
      )}

      {/* Fallback invite link (when email not configured) */}
      {inviteLink && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-[10px] text-[13px]"
          style={{ background: '#1a1f2a', border: '1px solid #2d3748' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="flex-1 truncate font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {inviteLink}
          </span>
          <button
            onClick={() => { void navigator.clipboard.writeText(inviteLink); toast.success('Link copied') }}
            className="flex items-center gap-1 text-[12px] shrink-0"
            style={{ color: 'var(--color-primary, #f97316)' }}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div
        className="flex gap-0 rounded-[10px] p-[3px] w-fit"
        style={{ background: '#f0f2f5' }}
      >
        {(['members', 'invites', 'permissions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-4 py-[6px] rounded-[7px] text-[13px] font-[500] transition-all"
            style={
              tab === t
                ? { background: 'var(--card-bg)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                : { background: 'transparent', color: 'var(--text-muted)' }
            }
          >
            {t === 'members' ? 'Members' : t === 'invites' ? 'Pending Invites' : 'Roles & Permissions'}
            {tabCount[t] != null && (
              <span
                className="text-[10px] font-[600] px-[6px] py-[1px] rounded-[10px] leading-[1.5]"
                style={
                  tab === t
                    ? { background: 'var(--color-primary, #f97316)22', color: 'var(--color-primary, #f97316)' }
                    : { background: '#e5e7eb', color: '#6b7280' }
                }
              >
                {tabCount[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Members tab ────────────────────────────────────────────────────── */}
      {tab === 'members' && (
        <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No team members yet.</p>
            </div>
          ) : (
            members.map(m => {
              const profile = m.profiles
              const name    = profile?.full_name ?? profile?.email ?? 'Unknown'
              const email   = profile?.email ?? ''
              const chip    = ROLE_CHIP[m.role] ?? ROLE_CHIP.employee!
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-0 flex-wrap"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-[600] text-white"
                    style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
                  >
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{name}</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]"
                      style={{ background: chip.bg, color: chip.color }}
                    >
                      {roleLabel(m.role)}
                    </span>
                    {!m.accepted_at && (
                      <span className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]"
                        style={{ background: '#fffbeb', color: '#d97706' }}>
                        Pending
                      </span>
                    )}
                    {m.user_id === currentUserId && (
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>You</span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Pending invites tab ────────────────────────────────────────────── */}
      {tab === 'invites' && (
        <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
          {invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No pending invitations.</p>
            </div>
          ) : (
            invites.map(inv => {
              const inviterName = inv.profiles?.full_name ?? inv.profiles?.email ?? 'Someone'
              const chip        = ROLE_CHIP[inv.role] ?? ROLE_CHIP.employee!
              const revoking    = actionLoading[inv.id]
              const resending   = actionLoading[inv.id + '-resend']
              return (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-0 flex-wrap"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  {/* Avatar placeholder */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-[600]"
                    style={{ background: '#1e2128', color: 'var(--text-muted)' }}
                  >
                    {inv.email[0]?.toUpperCase() ?? '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>
                      {inv.email}
                    </p>
                    <div className="flex items-center gap-1 mt-[2px]">
                      <Clock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {expiresIn(inv.expires_at)} · invited by {inviterName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[11px] font-[500] px-[9px] py-[3px] rounded-[20px]"
                      style={{ background: chip.bg, color: chip.color }}
                    >
                      {roleLabel(inv.role)}
                    </span>

                    {canManage && (
                      <>
                        {/* Resend */}
                        <button
                          onClick={() => handleResend(inv.id, inv.email)}
                          disabled={resending || revoking}
                          title="Resend invite"
                          className="p-1.5 rounded-[6px] transition-colors disabled:opacity-40"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-primary, #f97316)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Revoke */}
                        <button
                          onClick={() => handleRevoke(inv.id, inv.email)}
                          disabled={revoking || resending}
                          title="Revoke invite"
                          className="p-1.5 rounded-[6px] transition-colors disabled:opacity-40"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fc8181' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
                        >
                          <Trash2 className={`w-3.5 h-3.5 ${revoking ? 'opacity-50' : ''}`} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Permissions tab ────────────────────────────────────────────────── */}
      {tab === 'permissions' && (
        <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
          <div className="overflow-x-auto">
            <div
              className="grid items-center px-3 py-2 border-b text-[10px] font-[500] uppercase tracking-[0.05em]"
              style={{
                gridTemplateColumns: '160px repeat(3, 1fr)',
                background: 'var(--surface-subtle)',
                borderColor: 'var(--card-border)',
                color: 'var(--text-muted)',
              }}
            >
              <div>Module</div>
              {ROLES.map(r => (
                <div key={r} className="text-center">{roleLabel(r)}</div>
              ))}
            </div>
            {MODULES.map((mod, idx) => (
              <div
                key={mod}
                className="grid items-center px-3 py-2 border-b last:border-0"
                style={{ gridTemplateColumns: '160px repeat(3, 1fr)', borderColor: 'var(--card-border)' }}
              >
                <span className="text-[12px] font-[500]" style={{ color: 'var(--text-primary)' }}>{mod}</span>
                {ROLES.map(r => {
                  const on = perms[r]?.[idx] ?? false
                  return (
                    <div key={r} className="flex justify-center">
                      <button
                        onClick={() => togglePerm(r, idx)}
                        className="w-4 h-4 rounded-[3px] border relative transition-all"
                        style={
                          on
                            ? { background: 'var(--color-primary, #f97316)', borderColor: 'var(--color-primary, #f97316)' }
                            : { background: 'transparent', borderColor: 'var(--card-border)' }
                        }
                        title={r === 'owner' ? 'Owner always has full access' : `Toggle ${r} access to ${mod}`}
                      >
                        {on && (
                          <svg className="absolute inset-0 m-auto" width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="px-4 py-3" style={{ borderTop: '1px solid var(--card-border)' }}>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <Shield className="w-3 h-3 inline mr-1" />
              Permissions are enforced at the database level via Row Level Security. Visual toggles reflect role defaults.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

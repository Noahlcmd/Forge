'use client'

import { useState } from 'react'
import { Loader2, Check, UserPlus, Mail, Shield } from 'lucide-react'
import type { Role, MemberWithProfile } from '@/types'

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', employee: 'Member' }

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  owner:    { customers: true,  leads: true,  ads: true,  finance: true,  settings: true  },
  admin:    { customers: true,  leads: true,  ads: true,  finance: true,  settings: false },
  employee: { customers: true,  leads: true,  ads: false, finance: false, settings: false },
}

const PERM_LABELS = [
  { key: 'customers', label: 'Customers' },
  { key: 'leads',     label: 'Leads'     },
  { key: 'ads',       label: 'Ads'       },
  { key: 'finance',   label: 'Finance'   },
  { key: 'settings',  label: 'Settings'  },
]

interface Props {
  role:           Role
  members:        MemberWithProfile[]
  invitations:    { id: string; email: string; role: string; expires_at: string }[]
  currentUserId:  string
}

export function TeamTab({ role, members, invitations, currentUserId }: Props) {
  const [email,   setEmail]   = useState('')
  const [invRole, setInvRole] = useState<'admin' | 'employee'>('employee')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [invLink, setInvLink] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  const canInvite = role === 'owner' || role === 'admin'

  async function handleInvite() {
    if (!email.trim()) return
    setSending(true)
    setSent(false)
    setError(null)
    setInvLink(null)
    try {
      const res = await fetch('/api/team/invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), role: invRole }),
      })
      const data = await res.json() as { error?: string; inviteLink?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to send invite')
      setSent(true)
      setEmail('')
      if (data.inviteLink) setInvLink(data.inviteLink)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Members + Permissions table */}
      <div className="forge-card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Team members &amp; permissions
            </h2>
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''} — permissions are determined by role
          </p>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--input-bg)' }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>
                  User
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>
                  Role
                </th>
                {PERM_LABELS.map(p => (
                  <th key={p.key} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' }}>
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => {
                const p       = m.profiles
                const name    = p?.full_name ?? p?.email ?? 'Unknown'
                const initials = (name[0] ?? 'U').toUpperCase()
                const isYou   = m.user_id === currentUserId
                const perms   = ROLE_PERMISSIONS[m.role] ?? ROLE_PERMISSIONS.employee
                const isLast  = idx === members.length - 1

                return (
                  <tr key={m.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--card-border)' }}>
                    {/* User cell */}
                    <td style={{ padding: '12px 20px' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-semibold"
                          style={{ background: 'var(--color-primary)', color: '#fff', opacity: 0.85 }}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {name}
                            {isYou && <span className="ml-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>(you)</span>}
                          </p>
                          {p?.email && p.full_name && (
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{p.email}</p>
                          )}
                          {!m.accepted_at && (
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Pending acceptance</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role cell */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <RoleBadge role={m.role} />
                    </td>

                    {/* Permission cells */}
                    {PERM_LABELS.map(p => (
                      <td key={p.key} style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <PermCheck allowed={perms[p.key] ?? false} />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="forge-card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>Pending invitations</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{invitations.length} awaiting acceptance</p>
          </div>
          <div>
            {invitations.map((inv, idx) => (
              <div key={inv.id} className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: idx < invitations.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
                  <Mail className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>{inv.email}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <RoleBadge role={inv.role as Role} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      {canInvite && (
        <div className="forge-card p-5">
          <h2 className="text-[14px] font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Invite team member</h2>
          <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>Send an invitation via email.</p>

          <div className="flex gap-2 mb-3">
            {(['admin', 'employee'] as const).map(r => (
              <button key={r} onClick={() => setInvRole(r)}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                style={{
                  background:  invRole === r ? 'rgba(var(--color-primary-rgb, 249,115,22),0.1)' : 'var(--input-bg)',
                  border:      invRole === r ? '1px solid var(--color-primary)' : '1px solid var(--card-border)',
                  color:       invRole === r ? 'var(--color-primary)' : 'var(--text-secondary)',
                }}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              placeholder="colleague@company.com"
              className="forge-input flex-1"
            />
            <button onClick={handleInvite} disabled={sending || !email.trim()}
              className="btn btn-primary shrink-0"
              style={{ height: 36, opacity: sending || !email.trim() ? 0.5 : 1 }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : sent ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {sending ? 'Sending…' : sent ? 'Sent!' : 'Invite'}
            </button>
          </div>

          {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}

          {invLink && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)' }}>
              <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Invite link (copy and share):</p>
              <p className="text-[11px] font-mono break-all" style={{ color: 'var(--text-primary)' }}>{invLink}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    owner:    { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    admin:    { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    employee: { bg: 'var(--input-bg)',        color: 'var(--text-secondary)' },
  }
  const s = styles[role] ?? styles.employee
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: '1px solid transparent' }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function PermCheck({ allowed }: { allowed: boolean }) {
  return allowed
    ? <Check className="w-4 h-4 mx-auto" style={{ color: '#12a150' }} />
    : <span className="block w-4 h-4 mx-auto rounded-sm" style={{ background: 'var(--card-border)' }} />
}

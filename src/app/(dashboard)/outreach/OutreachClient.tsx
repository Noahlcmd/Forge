'use client'

import { useState } from 'react'
import { Mail, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

type Sequence = {
  id:         string
  name:       string
  status:     string
  from_name:  string | null
  from_email: string | null
  created_at: string
}

const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  draft:     { bg: '#f3f4f6', color: '#6b7280' },
  active:    { bg: '#e8f7ee', color: '#12a150' },
  paused:    { bg: '#fffbeb', color: '#d97706' },
  completed: { bg: '#eff6ff', color: '#2563eb' },
}

function SendTestButton({ seq, userEmail }: { seq: Sequence; userEmail: string }) {
  const [state,  setState]  = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  async function send() {
    setState('loading')
    try {
      const res  = await fetch(`/api/outreach/${seq.id}/send-test`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: userEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setErrMsg((data as { error?: string }).error ?? 'Send failed'); setState('error'); return }
      setState('sent')
      setTimeout(() => setState('idle'), 4000)
    } catch {
      setErrMsg('Network error'); setState('error')
    }
  }

  if (state === 'sent') return (
    <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: '#12a150' }}>
      <CheckCircle className="w-3.5 h-3.5" /> Sent!
    </span>
  )

  if (state === 'error') return (
    <span className="inline-flex items-center gap-1 text-[11px]" title={errMsg} style={{ color: '#e53e3e' }}>
      <AlertCircle className="w-3.5 h-3.5" /> Failed
      <button onClick={() => setState('idle')} className="underline ml-1">retry</button>
    </span>
  )

  return (
    <button
      onClick={send}
      disabled={state === 'loading'}
      title={`Send test to ${userEmail}`}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-[500] rounded-[6px] border transition-colors disabled:opacity-50"
      style={{ color: 'var(--text-muted)', borderColor: 'var(--card-border)' }}
    >
      {state === 'loading'
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <Send className="w-3 h-3" />}
      {state === 'loading' ? 'Sending…' : 'Send Test'}
    </button>
  )
}

export function OutreachClient({ sequences, userEmail, isDemo }: {
  sequences:  Sequence[]
  userEmail:  string
  isDemo:     boolean
}) {
  return (
    <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
              {['Sequence', 'Sender', 'Status', 'Created', ''].map(h => (
                <th key={h} className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sequences.map(seq => {
              const chip = STATUS_CHIP[seq.status] ?? STATUS_CHIP.draft
              return (
                <tr key={seq.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td className="px-4 py-[11px]">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: '#eef0ff' }}>
                        <Mail className="w-3.5 h-3.5" style={{ color: '#4f5fd4' }} />
                      </div>
                      <span className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>{seq.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {seq.from_email
                      ? <div><p>{seq.from_name ?? seq.from_email}</p>{seq.from_name && <p className="text-[11px]">{seq.from_email}</p>}</div>
                      : '—'}
                  </td>
                  <td className="px-4 py-[11px]">
                    <span className="chip" style={{ background: chip.bg, color: chip.color }}>
                      {seq.status.charAt(0).toUpperCase() + seq.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    {new Date(seq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-[11px] text-right">
                    {!isDemo && <SendTestButton seq={seq} userEmail={userEmail} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { getDemoMode } from '@/lib/demo'
import { AddSequenceForm } from './AddSequenceForm'
import { OutreachClient } from './OutreachClient'
import { Mail, AlertCircle } from 'lucide-react'

type Sequence = {
  id:         string
  name:       string
  status:     string
  from_name:  string | null
  from_email: string | null
  created_at: string
}


const DEMO_SEQUENCES: Sequence[] = [
  { id: '1', name: 'Cold Outreach — SaaS Founders', status: 'active',    from_name: 'Alex Smith', from_email: 'alex@yourcompany.com', created_at: '2026-04-01' },
  { id: '2', name: 'Follow-Up Sequence — Q2 Leads', status: 'active',    from_name: 'Alex Smith', from_email: 'alex@yourcompany.com', created_at: '2026-03-20' },
  { id: '3', name: 'Re-engagement — Cold Prospects', status: 'paused',   from_name: 'Alex Smith', from_email: 'alex@yourcompany.com', created_at: '2026-03-10' },
  { id: '4', name: 'Onboarding — New Signups',       status: 'completed', from_name: 'Alex Smith', from_email: 'alex@yourcompany.com', created_at: '2026-02-15' },
]

export default async function OutreachPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
  const supabase = createClient()
  const isDemo   = getDemoMode()

  const membership  = result.ok ? result.membership : null
  const userEmail   = result.ok ? result.profile.email : ''

  let sequences:  Sequence[]   = []
  let queryError: string | null = null

  if (isDemo) {
    sequences = DEMO_SEQUENCES
  } else if (result.ok) {
    const { data, error } = await supabase
      .from('outreach')
      .select('id, name, status, from_name, from_email, created_at')
      .eq('organization_id', result.membership.organizations.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[outreach page] query error:', error.message)
      queryError = 'Failed to load sequences. Please refresh.'
    } else {
      sequences = (data ?? []) as Sequence[]
    }
  }

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
            Outreach
          </h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            {sequences.length > 0
              ? `${sequences.length} sequence${sequences.length === 1 ? '' : 's'} · ${membership?.organizations?.name ?? ''}`
              : 'Email sequences and follow-ups'}
          </p>
        </div>
        <AddSequenceForm />
      </div>

      {queryError && (
        <div className="forge-card flex items-center gap-3 p-4" style={{ borderColor: '#fecaca' }}>
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-[13px] text-red-600">{queryError}</p>
        </div>
      )}

      {sequences.length === 0 && !queryError ? (
        <div className="forge-card flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f3f4f6' }}>
            <Mail className="w-6 h-6" style={{ color: '#9ca3af' }} />
          </div>
          <div>
            <p className="text-[14px] font-[500]" style={{ color: 'var(--text-primary)' }}>No sequences yet</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Create a sequence to follow up with leads automatically.
            </p>
          </div>
          <div
            className="rounded-[10px] border px-4 py-3 text-left max-w-xs"
            style={{ borderColor: 'var(--card-border)', background: 'var(--surface-subtle)' }}
          >
            <p className="text-[12px] font-[500] mb-2" style={{ color: 'var(--text-primary)' }}>How it works</p>
            <ol className="text-[12px] space-y-1 list-decimal list-inside" style={{ color: 'var(--text-muted)' }}>
              <li>Create a named sequence with a sender</li>
              <li>Add leads from your pipeline</li>
              <li>Click &ldquo;Send Test&rdquo; to verify email delivery</li>
            </ol>
          </div>
        </div>
      ) : !queryError ? (
        <OutreachClient sequences={sequences} userEmail={userEmail} isDemo={isDemo} />
      ) : null}
    </div>
  )
}

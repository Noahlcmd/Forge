import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { getDemoMode } from '@/lib/demo'
import { Target, MapPin } from 'lucide-react'
import { AddLeadForm } from './AddLeadForm'

type Lead = {
  id:           string
  company:      string | null
  contact_name: string | null
  industry:     string | null
  location:     string | null
  score:        number | null
  status:       string | null
  created_at:   string
}

const AVATAR_COLORS = [
  '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  new:       { bg: '#f3f4f6', color: '#6b7280' },
  contacted: { bg: '#eff6ff', color: '#2563eb' },
  qualified: { bg: '#fffbeb', color: '#d97706' },
  converted: { bg: '#e8f7ee', color: '#12a150' },
}

const STATUS_LABELS: Record<string, string> = {
  new:       'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
}

const DEMO_LEADS: Lead[] = [
  { id: '1', company: 'Apex Digital',      contact_name: 'Rachel Torres',  industry: 'SaaS',        location: 'San Francisco, CA', score: 92, status: 'qualified',  created_at: '2026-04-20' },
  { id: '2', company: 'BrightPath Media',  contact_name: 'James Liu',      industry: 'Marketing',   location: 'New York, NY',      score: 78, status: 'contacted',  created_at: '2026-04-18' },
  { id: '3', company: 'CoreShift Labs',    contact_name: 'Nina Patel',     industry: 'Engineering', location: 'Austin, TX',        score: 85, status: 'qualified',  created_at: '2026-04-15' },
  { id: '4', company: 'Drift Analytics',   contact_name: 'Marco Silva',    industry: 'Analytics',   location: 'Chicago, IL',       score: 61, status: 'contacted',  created_at: '2026-04-10' },
  { id: '5', company: 'Ember Ventures',    contact_name: 'Sarah Kim',      industry: 'VC / Invest', location: 'Boston, MA',        score: 45, status: 'new',        created_at: '2026-04-08' },
  { id: '6', company: 'FluxNode Systems',  contact_name: 'Tyler Brooks',   industry: 'DevOps',      location: 'Seattle, WA',       score: 97, status: 'converted',  created_at: '2026-04-01' },
]

export default async function LeadsPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  const isDemo   = getDemoMode()
  const membership = result.ok ? result.membership : null

  let leads: Lead[] = []

  if (isDemo) {
    leads = DEMO_LEADS
  } else if (result.ok) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('leads')
      .select('id, company, contact_name, industry, location, score, status, created_at')
      .eq('organization_id', result.membership.organizations.id)
      .order('created_at', { ascending: false })

    if (error) console.error('[leads page] query error:', error.message)
    leads = (data ?? []) as Lead[]
  }

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
            {leads.length > 0 ? `${leads.length} Lead${leads.length === 1 ? '' : 's'} in Pipeline` : 'Potential Clients'}
          </h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            {membership?.organizations?.name ?? 'Your organization'} · CRM pipeline
          </p>
        </div>
        <AddLeadForm />
      </div>

      {leads.length === 0 ? (
        <div className="forge-card flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#f3f4f6' }}>
            <Target className="w-6 h-6" style={{ color: '#9ca3af' }} />
          </div>
          <div>
            <p className="text-[14px] font-[500]" style={{ color: 'var(--text-primary)' }}>No leads yet</p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Import leads from{' '}
              <a href="/finding-clients" style={{ color: 'var(--color-primary)' }}>Finding Clients</a>
              {' '}to start your pipeline.
            </p>
          </div>
        </div>
      ) : (
        <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--card-border)' }}>
                  {['Company', 'Contact', 'Industry', 'Location', 'Score', 'Status'].map(h => (
                    <th key={h} className="px-4 py-[10px] text-left text-[11px] font-[500] uppercase tracking-[0.05em] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => {
                  const status = lead.status || 'new'
                  const ss = STATUS_STYLES[status] ?? STATUS_STYLES.new!
                  const companyName = lead.company || '?'
                  return (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #f3f5f7' }}>
                      <td className="px-4 py-[11px]">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ background: avatarColor(companyName) }}
                          >
                            {companyName[0].toUpperCase()}
                          </div>
                          <span className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>
                            {lead.company ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        {lead.contact_name ?? '—'}
                      </td>
                      <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        {lead.industry ?? '—'}
                      </td>
                      <td className="px-4 py-[11px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        {lead.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />{lead.location}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-[11px]">
                        {lead.score != null ? (
                          <span
                            className="inline-flex items-center justify-center w-9 h-6 rounded-md text-[11px] font-bold"
                            style={{
                              background: lead.score >= 80 ? '#e8f7ee' : lead.score >= 60 ? '#d1fae5' : lead.score >= 40 ? '#fef3c7' : '#fff0f0',
                              color:      lead.score >= 80 ? '#12a150' : lead.score >= 60 ? '#065f46' : lead.score >= 40 ? '#d97706' : '#e53e3e',
                            }}
                          >
                            {lead.score}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-[11px]">
                        <span className="chip" style={{ background: ss.bg, color: ss.color }}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

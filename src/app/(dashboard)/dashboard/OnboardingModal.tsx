'use client'

import { useState } from 'react'
import { Loader2, Check, ChevronRight, ChevronLeft, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

const INDUSTRIES = [
  'Technology', 'Marketing & Advertising', 'Finance & Accounting',
  'Healthcare', 'Retail & E-commerce', 'Construction & Real Estate',
  'Legal', 'Consulting', 'Education', 'Other',
]
const BUSINESS_TYPES = [
  { value: 'agency',     label: 'Agency',     desc: 'Client-service business managing campaigns or projects' },
  { value: 'freelancer', label: 'Freelancer', desc: 'Independent professional selling your expertise'        },
  { value: 'startup',    label: 'Startup',    desc: 'Early-stage company building a product or service'       },
  { value: 'ecommerce',  label: 'E-commerce', desc: 'Online store selling physical or digital products'       },
  { value: 'consulting', label: 'Consulting', desc: 'Advisory services for businesses or individuals'         },
  { value: 'accounting', label: 'Accounting', desc: 'Financial services, bookkeeping, or tax prep'            },
  { value: 'other',      label: 'Other',      desc: 'Something else — we will configure it for you'           },
]
const CLIENT_ACQS = ['Inbound', 'Outbound', 'Ads', 'Referrals']
const AD_BUDGETS  = ['< $500/mo', '$500–$2k/mo', '$2k–$10k/mo', '$10k+/mo']
const TEAM_SIZES  = ['Just me', '2–5', '6–15', '16–50', '50+']

interface Props { orgId: string; orgName: string }

export function OnboardingModal({ orgId: _orgId, orgName }: Props) {
  const [step,      setStep]      = useState(1)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Step 1 state
  const [name,         setName]         = useState(orgName)
  const [industry,     setIndustry]     = useState('')
  const [businessType, setBusinessType] = useState('')

  // Step 2 state
  const [clientAcq,     setClientAcq]     = useState<string[]>([])
  const [runsAds,       setRunsAds]       = useState(false)
  const [adBudget,      setAdBudget]      = useState('')
  const [inventory,     setInventory]     = useState(false)
  const [invoices,      setInvoices]      = useState(false)
  const [needsCrm,      setNeedsCrm]      = useState(true)
  const [automation,    setAutomation]    = useState(false)
  const [wantsAi,       setWantsAi]       = useState(false)
  const [team,          setTeam]          = useState(false)
  const [teamSize,      setTeamSize]      = useState('')

  async function handleComplete() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:              name.trim() || orgName,
          industry,
          business_type:     businessType,
          client_acquisition: clientAcq,
          runs_ads:          runsAds,
          ad_budget:         adBudget,
          manages_inventory: inventory,
          sends_invoices:    invoices,
          needs_crm:         needsCrm,
          needs_automation:  automation,
          wants_ai:          wantsAi,
          manages_team:      team,
          team_size:         teamSize,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Failed to save')
      }
      // Full navigation — guarantees a fresh server render where onboarding_completed=true
      // means the modal is not included in the HTML at all. router.refresh() alone is a
      // soft patch that can leave the modal mounted during reconciliation.
      window.location.href = '/dashboard'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const toggleAcq = (v: string) =>
    setClientAcq(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])

  const canNext1 = name.trim().length > 0 && businessType.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Set up your workspace</p>
              <p className="text-xs text-zinc-500">Step {step} of 3</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={cn('h-1.5 rounded-full transition-all', s <= step ? 'bg-orange-500 w-6' : 'bg-zinc-700 w-4')} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto space-y-5">

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <SectionHeader title="Tell us about your business" sub="We will configure your workspace based on your answers." />

              <Field label="Business name *">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Acme Inc."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/60 transition-colors" />
              </Field>

              <Field label="Industry">
                <select value={industry} onChange={e => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:border-orange-500/60 transition-colors">
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </Field>

              <Field label="Business type *">
                <div className="grid grid-cols-2 gap-2">
                  {BUSINESS_TYPES.map(({ value, label, desc }) => (
                    <button key={value} onClick={() => setBusinessType(value)}
                      className={cn('text-left p-3 rounded-lg border text-sm transition-all',
                        businessType === value
                          ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600')}>
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-zinc-600 mt-0.5 leading-snug">{desc}</p>
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <SectionHeader title="How do you operate?" sub="We will enable the right tools automatically." />

              <Field label="How do you get clients? (select all that apply)">
                <div className="flex flex-wrap gap-2">
                  {CLIENT_ACQS.map(v => (
                    <Chip key={v} label={v} active={clientAcq.includes(v)} onClick={() => toggleAcq(v)} />
                  ))}
                </div>
              </Field>

              <YesNo label="Do you run paid ads?"           value={runsAds}    onChange={setRunsAds} />
              {runsAds && (
                <Field label="Monthly ad budget">
                  <div className="flex flex-wrap gap-2">{AD_BUDGETS.map(b => <Chip key={b} label={b} active={adBudget === b} onClick={() => setAdBudget(b)} />)}</div>
                </Field>
              )}

              <YesNo label="Do you manage inventory?"       value={inventory}  onChange={setInventory} />
              <YesNo label="Do you send invoices?"          value={invoices}   onChange={setInvoices} />
              <YesNo label="Do you need CRM tracking?"      value={needsCrm}   onChange={setNeedsCrm} />
              <YesNo label="Do you need email sequences?"   value={automation} onChange={setAutomation} />
              <YesNo label="Do you want AI assistance?"     value={wantsAi}    onChange={setWantsAi} />
              <YesNo label="Do you manage a team?"          value={team}       onChange={setTeam} />
              {team && (
                <Field label="Team size">
                  <div className="flex flex-wrap gap-2">{TEAM_SIZES.map(s => <Chip key={s} label={s} active={teamSize === s} onClick={() => setTeamSize(s)} />)}</div>
                </Field>
              )}
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <SectionHeader title="Your workspace is ready" sub="Review your setup — everything can be changed in Settings." />
              <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4 space-y-2">
                <InfoRow label="Business name"   value={name || orgName} />
                <InfoRow label="Industry"        value={industry || '—'} />
                <InfoRow label="Business type"   value={BUSINESS_TYPES.find(b => b.value === businessType)?.label ?? '—'} />
                <InfoRow label="Client sources"  value={clientAcq.join(', ') || '—'} />
                <InfoRow label="Runs paid ads"   value={runsAds ? `Yes — ${adBudget || 'budget TBD'}` : 'No'} />
                <InfoRow label="Manages team"    value={team ? `Yes — ${teamSize || 'size TBD'}` : 'No'} />
                <InfoRow label="AI assistance"   value={wantsAi ? 'Enabled' : 'Not enabled'} />
              </div>
              <p className="text-xs text-zinc-600 bg-zinc-800/50 rounded-lg p-3">
                You can enable or disable any module at any time from Settings.
              </p>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft className="w-4 h-4" />Back
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && !canNext1}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
              Continue<ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleComplete} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving…' : 'Complete setup'}
              {!loading && <Check className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-100 mb-1">{title}</h2>
      <p className="text-xs text-zinc-500">{sub}</p>
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
        active ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600')}>
      {label}
    </button>
  )
}
function YesNo({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-zinc-300 flex-1">{label}</span>
      <div className="flex gap-1.5 shrink-0">
        {([true, false] as const).map(v => (
          <button key={String(v)} onClick={() => onChange(v)}
            className={cn('px-3 py-1 rounded-md text-xs font-medium border transition-all',
              value === v
                ? v ? 'bg-green-400/10 border-green-400/30 text-green-400' : 'bg-zinc-700 border-zinc-600 text-zinc-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600')}>
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    </div>
  )
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-zinc-700/50 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs text-zinc-300 text-right">{value}</span>
    </div>
  )
}

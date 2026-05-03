'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Target, Trash2, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'

type Audience = {
  id:             string
  name:           string
  locations:      string[]
  industries:     string[]
  company_sizes:  string[]
  job_titles:     string[]
  platforms:      string[]
  estimated_size: number | null
  created_at:     string
}

const LOCATIONS    = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Europe', 'Asia Pacific', 'Latin America', 'Global']
const INDUSTRIES   = ['Technology', 'Finance', 'Healthcare', 'E-commerce', 'Marketing', 'Education', 'Real Estate', 'Legal', 'Manufacturing', 'Consulting']
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']
const JOB_TITLES   = ['CEO', 'CMO', 'CTO', 'VP Marketing', 'Director', 'Manager', 'Founder', 'Owner', 'Head of Growth']
const PLATFORMS    = ['Meta Ads', 'Google Ads', 'LinkedIn Ads', 'TikTok Ads']

function estimate(locs: string[], inds: string[], sizes: string[]): number {
  return Math.round(50000 * Math.max(locs.length, 1) * Math.max(inds.length * 0.5, 1) * Math.max(sizes.length * 0.3, 1))
}

function Chips({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])
  }
  return (
    <div>
      <p className="text-[11px] font-[500] mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="px-2.5 py-[4px] text-[12px] rounded-[20px] border transition-all"
            style={
              selected.includes(opt)
                ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#fff' }
                : { background: 'transparent', borderColor: 'var(--card-border)', color: 'var(--text-muted)' }
            }
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function AudienceBuilderPage() {
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [creating,  setCreating]  = useState(false)

  const [name,      setName]      = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [industries,setIndustries]= useState<string[]>([])
  const [sizes,     setSizes]     = useState<string[]>([])
  const [titles,    setTitles]    = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/audiences')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setAudiences(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function reset() {
    setName(''); setLocations([]); setIndustries([])
    setSizes([]); setTitles([]); setPlatforms([])
    setCreating(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const est = estimate(locations, industries, sizes)
      const res = await fetch('/api/audiences', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), locations, industries,
          company_sizes: sizes, job_titles: titles, platforms, estimated_size: est,
        }),
      })
      const data = await res.json() as Audience & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setAudiences(prev => [data, ...prev])
      reset()
      toast.success('Audience saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/audiences?id=${id}`, { method: 'DELETE' })
      setAudiences(prev => prev.filter(a => a.id !== id))
      toast.success('Audience deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const est = estimate(locations, industries, sizes)

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]">Audience Builder</h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            Define and save custom audiences for your ad campaigns
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-[500] text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus className="w-4 h-4" />
            New Audience
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={handleSave} className="forge-card space-y-5" style={{ padding: 20 }}>
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-[600]">Define Audience</p>
            <span
              className="px-3 py-1 rounded-[20px] text-[12px] font-[500]"
              style={{ background: '#eef0ff', color: '#4f5fd4' }}
            >
              ~{est.toLocaleString()} estimated reach
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-[500] mb-1" style={{ color: 'var(--text-muted)' }}>
              Audience name *
            </label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. US Tech Decision Makers"
              className="forge-input"
            />
          </div>

          <Chips label="Locations"    options={LOCATIONS}    selected={locations}  onChange={setLocations} />
          <Chips label="Industries"   options={INDUSTRIES}   selected={industries} onChange={setIndustries} />
          <Chips label="Company Size" options={COMPANY_SIZES} selected={sizes}     onChange={setSizes} />
          <Chips label="Job Titles"   options={JOB_TITLES}   selected={titles}     onChange={setTitles} />
          <Chips label="Push to Platforms" options={PLATFORMS} selected={platforms} onChange={setPlatforms} />

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-[500] rounded-[10px] text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Audience
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-[13px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : audiences.length === 0 && !creating ? (
        <div className="forge-card flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-12 h-12 rounded-[12px] flex items-center justify-center" style={{ background: '#eef0ff' }}>
            <Users className="w-6 h-6" style={{ color: '#4f5fd4' }} />
          </div>
          <div>
            <p className="text-[14px] font-[600]">No saved audiences</p>
            <p className="text-[13px] mt-1 max-w-[300px]" style={{ color: 'var(--text-muted)' }}>
              Create targeted audiences by location, industry, and job title to use across campaigns.
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-[500] text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus className="w-4 h-4" />
            Create First Audience
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {audiences.map(a => (
            <div key={a.id} className="forge-card" style={{ padding: 16 }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: '#eef0ff' }}
                  >
                    <Target className="w-4 h-4" style={{ color: '#4f5fd4' }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-[600]">{a.name}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {[
                        a.locations.length  > 0 && a.locations.slice(0, 2).join(', '),
                        a.industries.length > 0 && a.industries.slice(0, 2).join(', '),
                        a.company_sizes.length > 0 && a.company_sizes.join(', '),
                      ].filter(Boolean).join(' · ')}
                    </p>
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {a.platforms.map(p => (
                        <span
                          key={p}
                          className="text-[10px] font-[500] px-2 py-[2px] rounded-[20px]"
                          style={{ background: '#eef0ff', color: '#4f5fd4' }}
                        >
                          {p}
                        </span>
                      ))}
                      {a.estimated_size && (
                        <span
                          className="text-[10px] font-[500] px-2 py-[2px] rounded-[20px]"
                          style={{ background: '#e8f7ee', color: '#12a150' }}
                        >
                          ~{a.estimated_size.toLocaleString()} reach
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-1.5 rounded-[6px] transition-colors shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

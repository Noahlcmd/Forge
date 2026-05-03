'use client'

import { useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'

export interface SearchFilters {
  query:    string
  industry: string
  location: string
  size:     string
}

interface SearchBarProps {
  onFilter: (filters: SearchFilters) => void
}

const INDUSTRIES = ['SaaS / Software', 'Marketing', 'Healthcare', 'Supply Chain', 'E-Commerce', 'Finance', 'Agriculture']
const LOCATIONS  = ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Chicago, IL', 'Los Angeles, CA', 'Nashville, TN', 'Seattle, WA']
const SIZES      = ['1–10', '11–50', '51–200', '201–500', '500+']

const SELECT_BASE =
  'appearance-none h-9 pl-3 pr-8 rounded-lg bg-zinc-800/60 border border-zinc-700 text-sm text-zinc-300 ' +
  'focus:outline-none focus:border-orange-500/50 transition-colors cursor-pointer hover:border-zinc-600'

export function SearchBar({ onFilter }: SearchBarProps) {
  const [f, setF] = useState<SearchFilters>({ query: '', industry: '', location: '', size: '' })

  function update<K extends keyof SearchFilters>(key: K, value: string) {
    const next = { ...f, [key]: value }
    setF(next)
    onFilter(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">

      {/* Search input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={f.query}
          onChange={e => update('query', e.target.value)}
          placeholder="Search companies, contacts, industries…"
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-800/60 border border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
        />
      </div>

      {/* Industry */}
      <div className="relative">
        <select value={f.industry} onChange={e => update('industry', e.target.value)} className={SELECT_BASE}>
          <option value="">Industry</option>
          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
      </div>

      {/* Location */}
      <div className="relative">
        <select value={f.location} onChange={e => update('location', e.target.value)} className={SELECT_BASE}>
          <option value="">Location</option>
          {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
      </div>

      {/* Size */}
      <div className="relative">
        <select value={f.size} onChange={e => update('size', e.target.value)} className={SELECT_BASE}>
          <option value="">Company Size</option>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
      </div>

    </div>
  )
}

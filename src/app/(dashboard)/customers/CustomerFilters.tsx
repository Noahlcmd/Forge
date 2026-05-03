'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Search } from 'lucide-react'

export function CustomerFilters() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const q      = searchParams.get('q')      ?? ''
  const status = searchParams.get('status') ?? ''
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`/customers?${params.toString()}`)
    },
    [router, searchParams],
  )

  const debouncedUpdate = useCallback(
    (key: string, value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => update(key, value), 400)
    },
    [update],
  )

  return (
    <div className="forge-card p-3 flex items-center gap-3 flex-wrap">
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          defaultValue={q}
          placeholder="Search customers…"
          className="forge-input pl-8 text-[13px]"
          style={{ width: 220 }}
          onChange={e => debouncedUpdate('q', e.target.value)}
        />
      </div>
      <select
        value={status}
        onChange={e => update('status', e.target.value)}
        className="forge-input text-[13px]"
        style={{ width: 130 }}
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="inactive">Inactive</option>
      </select>
      {(q || status) && (
        <button
          onClick={() => router.push('/customers')}
          className="text-[12px] transition-colors hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

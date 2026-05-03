'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface SafeDataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Fetches data from an API endpoint with built-in loading, error, and empty
 * state management. Handles JSON parsing, network errors, and API error shapes.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useSafeData<Customer[]>(
 *     () => fetch('/api/customers').then(r => r.json()),
 *   )
 *
 * The fetch function should throw on failure (or return a value that can be
 * checked). If the server returns `{ error: string }`, that error message is
 * surfaced automatically.
 */
export function useSafeData<T>(
  fetchFn: () => Promise<T>,
  // Stable deps that trigger re-fetch (like useEffect deps)
  deps: unknown[] = [],
): SafeDataState<T> {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Keep a stable ref to fetchFn so we don't re-create the callback on every render
  const fnRef = useRef(fetchFn)
  fnRef.current = fetchFn

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fnRef.current()
      // If the result looks like an API error envelope, surface the message
      if (
        result !== null &&
        typeof result === 'object' &&
        !Array.isArray(result) &&
        'error' in result &&
        typeof (result as { error: unknown }).error === 'string'
      ) {
        setError((result as { error: string }).error)
        setData(null)
      } else {
        setData(result)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load data. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { data, loading, error, refetch: run }
}

/**
 * Lightweight fetch helper used inside useSafeData fetch functions.
 * Throws a human-readable error if the response is not OK.
 *
 * Usage:
 *   const customers = await fetchApi<Customer[]>('/api/customers')
 */
export async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (json as { error?: string }).error ?? `Request failed (${res.status})`
    throw new Error(msg)
  }
  return json as T
}

import { NextResponse } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

type PostgrestError = { message: string; code?: string; details?: string | null }

type QueryResult<T> = { data: T | null; error: PostgrestError | null }

// ── safeQuery ─────────────────────────────────────────────────────────────────

/**
 * Wraps any Supabase query function so it never throws.
 * Returns { data, error } where error is a human-readable string or null.
 * When data is null (DB error or empty), it defaults to [] for arrays.
 *
 * Usage:
 *   const { data, error } = await safeQuery(() =>
 *     supabase.from('customers').select('*').eq('organization_id', orgId)
 *   )
 */
export async function safeQuery<T>(
  fn: () => PromiseLike<QueryResult<T>>,
): Promise<{ data: T; error: string | null }> {
  try {
    const { data, error } = await fn()
    if (error) {
      console.error('[safeQuery]', error.code ?? 'DB_ERROR', error.message)
      // Return [] for arrays, null for single objects — caller decides how to handle
      const fallback = (Array.isArray(data) ? [] : null) as unknown as T
      return { data: fallback, error: error.message }
    }
    // Normalise null → [] for array queries
    const result = data ?? ([] as unknown as T)
    return { data: result, error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[safeQuery] unexpected:', msg)
    return { data: [] as unknown as T, error: msg }
  }
}

// ── withSafeHandler ───────────────────────────────────────────────────────────

/**
 * Wraps a Next.js App Router route handler.
 * Any uncaught exception becomes a clean 500 — no internal details are leaked.
 * Context (route params) are passed through transparently so destructuring still works.
 *
 * Usage (no params):
 *   export const GET = withSafeHandler(async (req) => { ... })
 *
 * Usage (with [id] param):
 *   export const DELETE = withSafeHandler(async (req, { params }: { params: { id: string } }) => {
 *     const { id } = params
 *     ...
 *   })
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withSafeHandler(handler: (req: Request, ctx?: any) => Promise<Response>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, ctx?: any): Promise<Response> => {
    try {
      return await handler(req, ctx)
    } catch (e) {
      const path = (() => { try { return new URL(req.url).pathname } catch { return req.url } })()
      console.error(`[API ${req.method} ${path}] uncaught:`, e instanceof Error ? e.message : e)
      return NextResponse.json(
        { error: 'An unexpected error occurred. Please try again.' },
        { status: 500 },
      )
    }
  }
}

// ── Response helpers ──────────────────────────────────────────────────────────

/** Standard success response. Pass data directly — clients receive it as-is. */
export function apiOk(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/** Standard error response. Never leaks internal details to the client. */
export function apiErr(message: string, status = 500): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/** Auth-required guard — returns 401 if user is null. */
export function requireAuth(
  user: { id: string } | null | undefined,
): NextResponse | null {
  if (!user) return apiErr('Unauthorized', 401)
  return null
}

// ── enforceOrgQuery ───────────────────────────────────────────────────────────

/**
 * Appends .eq('organization_id', orgId) to any Supabase query builder.
 *
 * Acts as a hard code-level guard: if orgId is null/undefined it throws
 * immediately (caught by withSafeHandler → clean 500, nothing leaked).
 * This makes it IMPOSSIBLE to accidentally fire an unscoped query — the
 * function call itself blows up before the DB is ever hit.
 *
 * Usage:
 *   const { data, error } = await enforceOrgQuery(
 *     supabase.from('customers').select('id, name'),
 *     orgId,
 *   )
 *
 * Equivalent (but safer) to:
 *   supabase.from('customers').select('id, name').eq('organization_id', orgId)
 *
 * Test cases:
 *   enforceOrgQuery(q, 'uuid-...')      // ✅ appends .eq filter
 *   enforceOrgQuery(q, null)            // ❌ throws → 500 (never hits DB)
 *   enforceOrgQuery(q, undefined)       // ❌ throws → 500 (never hits DB)
 *   enforceOrgQuery(q, '')              // ❌ throws → 500 (never hits DB)
 */
export function enforceOrgQuery<
  // Supabase FilterBuilder / PostgrestFilterBuilder both expose .eq()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { eq: (column: string, value: unknown) => any }
>(query: T, orgId: string | null | undefined): ReturnType<T['eq']> {
  if (!orgId) {
    // Throwing here is intentional — withSafeHandler catches it and
    // returns a clean 500. The DB is NEVER queried without an org scope.
    throw Object.assign(
      new Error('enforceOrgQuery: orgId is missing — refusing to run unscoped query'),
      { code: 'NO_ORG_SCOPE' },
    )
  }
  return query.eq('organization_id', orgId)
}

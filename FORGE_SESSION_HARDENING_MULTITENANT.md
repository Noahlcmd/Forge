# Forge App — Session Summary: Hardening + Multi-Tenant Audit
**Date:** 2026-05-03  
**Covers:** Two full sessions — (1) Break-test & system-wide safety enforcement, (2) Full multi-tenant audit & fixes.

---

## Tech Stack

- **Framework:** Next.js 14 App Router (server components + `'use client'` pattern)
- **Database:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Auth pattern:** `createClient()` = RLS-scoped user client; `createAdminClient()` = service role, bypasses RLS
- **Validation:** Zod on all API routes
- **Email:** Resend (`RESEND_API_KEY`)
- **Payments:** Stripe (subscription billing, webhooks)
- **AI:** Anthropic API (`claude-haiku-4-5-20251001`)
- **Language:** TypeScript (strict, `npx tsc --noEmit` = 0 errors at end of session)

---

## Project Structure (key paths)

```
src/
  app/
    (dashboard)/
      customers/page.tsx + CustomersClient.tsx
      leads/ + AddLeadForm.tsx
      calendar/page.tsx
      chat/page.tsx
      workspace/
        page.tsx
        [module]/page.tsx
        projects/ + ProjectsClient.tsx
        tasks/ + TasksClient.tsx
        notes/ + NotesClient.tsx
        equipment/ + EquipmentClient.tsx
        suppliers/ + SuppliersClient.tsx
        inventory/ + InventoryClient.tsx
        wiki/ + WikiClient.tsx
        files/ + FilesClient.tsx
        pipeline/ + PipelinesClient.tsx
        _module-template/          ← NEW: template for new modules
          page.tsx
          ThingClient.tsx
          _api-template.ts
          _api-id-template.ts
      team/page.tsx
      ads/reports/page.tsx
      reports/page.tsx
    api/                           ← 51 route files total
  lib/
    safe-server.ts                 ← NEW
    sanitize.ts                    ← NEW
    supabase/server.ts
    supabase/admin.ts
    auth/getAppUser.ts
  hooks/
    useSafeData.ts                 ← NEW
  components/
    ui/
      StatusStates.tsx             ← NEW
supabase/
  schema.sql                      ← full multi-tenant schema
  migrations/
    001–018 (existing)
    019_creative_assets_audiences_channel_memberships.sql  ← NEW
```

---

## Session 1: Break-Test & System-Wide Safety Enforcement

### New Files Created

#### `src/lib/safe-server.ts`
Core safety utilities. Every API route depends on this.

```typescript
// safeQuery — wraps Supabase queries, never throws
export async function safeQuery<T>(
  fn: () => PromiseLike<QueryResult<T>>,
): Promise<{ data: T; error: string | null }>

// withSafeHandler — wraps route handlers, uncaught exceptions → clean 500
export function withSafeHandler(handler: (req: Request, ctx?: any) => Promise<Response>)

// enforceOrgQuery — appends .eq('organization_id', orgId), throws if orgId missing
export function enforceOrgQuery<T extends { eq: ... }>(query: T, orgId: string | null | undefined): ReturnType<T['eq']>

// apiOk / apiErr — standard response helpers
export function apiOk(data: unknown, status = 200): NextResponse
export function apiErr(message: string, status = 500): NextResponse

// requireAuth — returns 401 response if user is null
export function requireAuth(user: { id: string } | null | undefined): NextResponse | null
```

**Key design decisions:**
- `withSafeHandler` uses `ctx?: any` (not a generic) so existing `{ params }` destructuring works unchanged
- `safeQuery` accepts `PromiseLike` not `Promise` so Supabase `PostgrestFilterBuilder` (which is thenable but not `Promise`) satisfies the type
- `enforceOrgQuery` throws before the DB is ever hit if `orgId` is falsy — `withSafeHandler` catches it → clean 500

#### `src/lib/sanitize.ts`
```typescript
export function sanitizeSearchQuery(value: string, maxLength = 200): string
  // strips PostgREST metacharacters: , ( ) ' " ; \ % _

export function sanitizeInput(value: string, maxLength = 500): string
  // strips HTML tags, null bytes

export function sanitizeSlug(value: string, maxLength = 80): string
export function sanitizeEnum<T extends string>(value, allowed, defaultValue): T
```

#### `src/components/ui/StatusStates.tsx`
Shared UI states — used across all workspace client components.
```tsx
export function LoadingState({ rows?: number, message?: string })
  // skeleton rows (default 3) OR spinner with message

export function ErrorState({ message: string, onRetry?: () => void })
  // red card with AlertCircle icon, optional retry button

export function EmptyState({ icon, title, description, action?: ReactNode })
  // centered icon + title + description + optional action button
```

#### `src/hooks/useSafeData.ts`
```typescript
export function useSafeData<T>(fetchFn: () => Promise<T>, deps?: unknown[]): {
  data: T | null; loading: boolean; error: string | null; refetch: () => void
}

export async function fetchApi<T>(url: string, init?: RequestInit): Promise<T>
  // throws Error with user-safe message on non-OK HTTP response
```

#### Module Template (`src/app/(dashboard)/workspace/_module-template/`)
Four files enforcing all patterns for new workspace modules:
- `page.tsx` — server component with `getAppUser()` try/catch, `safeQuery`, module gate
- `ThingClient.tsx` — client component with `fetchApi`, double-submit guard, `StatusStates`
- `_api-template.ts` — GET + POST route with `withSafeHandler`, `sanitizeInput`, Zod
- `_api-id-template.ts` — PATCH + DELETE with `withSafeHandler`, org-scoped admin writes

### Pages Fixed (Break-Test Pass)

| File | Fix |
|---|---|
| `calendar/page.tsx` | Added try/catch on `getAppUser()`; fixed wrong table name `events` → `calendar_events` |
| `chat/page.tsx` | Added try/catch on `getAppUser()` |
| `workspace/page.tsx` | Added try/catch on `getAppUser()` |
| `workspace/[module]/page.tsx` | Added try/catch on `getAppUser()` |
| `team/page.tsx` | Added try/catch on `getAppUser()` |
| `ads/reports/page.tsx` | Added try/catch on `getAppUser()` |
| `customers/page.tsx` | Filter injection fix: `sanitizeSearchQuery(q)`; generic error to UI; raw error to console |
| `reports/page.tsx` | Added `console.error` for query errors; null-safe `?? 0` on `tx.amount_cents` |
| `leads/AddLeadForm.tsx` | Added `toast.success('Lead added')` after successful submission |

**Pattern for `getAppUser()` in all server pages:**
```typescript
let result: Awaited<ReturnType<typeof getAppUser>>
try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
if (!result.ok) redirect('/dashboard')
```

### API Routes — `withSafeHandler` Applied to All 51 Routes

**Before:**
```typescript
export async function GET() { ... }
```
**After:**
```typescript
export const GET = withSafeHandler(async (req) => { ... })
```

All 51 routes wrapped. Any uncaught exception (e.g. `createAdminClient()` throwing on missing env vars) becomes a clean `{ error: 'An unexpected error occurred.' }` 500.

### Client Components Updated to Use `StatusStates`

All workspace client components replaced inline loading/error/empty JSX:
- `CustomersClient.tsx` — EmptyState
- `ProjectsClient.tsx` — LoadingState, ErrorState, EmptyState  
- `TasksClient.tsx` — LoadingState, ErrorState, EmptyState
- `NotesClient.tsx` — LoadingState, ErrorState, EmptyState
- `EquipmentClient.tsx` — LoadingState, ErrorState, EmptyState
- `SuppliersClient.tsx` — LoadingState, ErrorState, EmptyState
- `InventoryClient.tsx` — LoadingState, ErrorState, EmptyState
- `PipelinesClient.tsx` — LoadingState, ErrorState, EmptyState
- `WikiClient.tsx` — LoadingState, ErrorState, EmptyState (with `action` prop preserving "Create First Page" CTA)
- `FilesClient.tsx` — LoadingState, ErrorState, EmptyState

**Note on `WikiClient.tsx`:** The `action` prop on `EmptyState` must be preserved:
```tsx
<EmptyState
  action={!search && (
    <button onClick={() => setView('editor')} className="btn btn-primary">
      <Plus className="w-4 h-4" /> Create First Page
    </button>
  )}
/>
```

---

## Session 2: Full Multi-Tenant Audit

### Methodology
Read all 51 API route files + `schema.sql` + all 14 migration files manually.

### Issues Found & Fixed

#### 🔴 CRITICAL — 3 tables had no migration files

`creative_assets` (used by `/api/creatives`), `audiences` (used by `/api/audiences`), and `channel_memberships` (used by `/api/chat/channels/[id]/leave`) existed only as API calls with no backing SQL migration — meaning no tables, no `organization_id` column, no RLS.

**Fix:** `supabase/migrations/019_creative_assets_audiences_channel_memberships.sql`

All three tables:
- `organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- RLS enabled with `organization_id in (select public.my_org_ids())` policies
- Separate SELECT, INSERT (with CHECK), UPDATE, DELETE policies
- `GRANT ... TO authenticated`

#### 🔴 CRITICAL — `/api/chat/messages` POST: cross-org channel write

The POST handler accepted `channel_id` from user input and inserted without verifying the channel belongs to the caller's org. A user from org1 could POST a message linked to org2's channel_id.

**Fix** (added before the admin insert):
```typescript
// Verify the channel belongs to this org — prevents cross-org channel writes
const { data: channel } = await supabase
  .from('chat_channels')
  .select('id')
  .eq('id', parsed.data.channel_id)
  .eq('organization_id', orgId)
  .maybeSingle()

if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
```

#### 🔴 CRITICAL — `/api/chat/channels/[id]/leave`: `organization_id` missing from upsert

The leave route wrote to `channel_memberships` without `organization_id`, which would fail RLS.

**Fix:** Added `organization_id: membership.organization_id` to the upsert payload.

#### 🟡 HIGH — `/api/search`: partial inline sanitizer

Used `q.replace(/[,()]/g, '')` — missing `'";\\%_` which are also PostgREST metacharacters.

**Fix:** Now uses `sanitizeSearchQuery` from `@/lib/sanitize`:
```typescript
import { sanitizeSearchQuery } from '@/lib/sanitize'
// ...
const safeQ = sanitizeSearchQuery(q)
```

### `enforceOrgQuery` — New Safety Primitive

Added to `src/lib/safe-server.ts`. Appends `.eq('organization_id', orgId)` to any Supabase query builder AND throws if `orgId` is falsy (before DB is ever hit).

```typescript
// Usage
const { data, error } = await enforceOrgQuery(
  supabase.from('customers').select('id, name'),
  orgId,
)

// enforceOrgQuery(q, null)      → throws → withSafeHandler → clean 500
// enforceOrgQuery(q, undefined) → throws → withSafeHandler → clean 500
// enforceOrgQuery(q, '')        → throws → withSafeHandler → clean 500
// enforceOrgQuery(q, 'uuid')    → returns query.eq('organization_id', 'uuid')
```

### Tenant Isolation — How It's Enforced (Layers)

| Layer | Mechanism |
|---|---|
| **DB (RLS)** | All tables: `using (organization_id in (select public.my_org_ids()))` |
| **API (session)** | `orgId` always derived from `memberships` table via authenticated session — never from request body |
| **API (query scope)** | Every `.from(table)` call has `.eq('organization_id', orgId)` |
| **API ([id] mutations)** | All PATCH/DELETE use both `.eq('id', params.id).eq('organization_id', orgId)` — ID alone is never enough |
| **enforceOrgQuery** | Code-level guard: throws before DB if orgId is missing |
| **withSafeHandler** | Catches any throw → clean 500, no internals leaked |

### Multi-Tenant DB Schema Summary

Every data table has:
- `organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`
- `CREATE INDEX ... ON table(organization_id)`
- RLS enabled with `my_org_ids()` helper function

Tables: `customers`, `leads`, `outreach`, `messages`, `calendars`, `events`, `finances`, `invoices`, `transactions`, `integrations`, `campaigns`, `audit_logs`, `chat_channels`, `chat_messages`, `notifications`, `inventory_items`, `files`, `pipeline_deals`, `wiki_pages`, `projects`, `tasks`, `notes`, `equipment`, `suppliers`, `creative_assets`, `audiences`, `channel_memberships`

Tables intentionally **without** `organization_id`: `profiles` (user identity, scoped by `id = auth.uid()`), `memberships` (the join table itself)

---

## Current State

- **TypeScript:** 0 errors (`npx tsc --noEmit`)
- **All 51 API routes:** wrapped with `withSafeHandler`
- **All API routes:** derive `orgId` from session, never from request body
- **All [id] mutations:** scoped by both `id` AND `organization_id`
- **All workspace clients:** use shared `StatusStates` components
- **Migration 019:** run this in Supabase SQL editor to create the 3 missing tables

---

## Known Patterns / Conventions

### `getAppUser()` — always wrap in try/catch
```typescript
let result: Awaited<ReturnType<typeof getAppUser>>
try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
if (!result.ok) redirect('/dashboard')
const { membership } = result
const orgId = membership.organizations.id
```

### API route structure
```typescript
export const GET = withSafeHandler(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('Unauthorized', 401)

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return apiErr('No active organization', 400)

  const { data, error } = await supabase
    .from('table')
    .select('...')
    .eq('organization_id', orgId)
    // ...
})
```

### Admin client for writes (bypasses RLS for inserts)
```typescript
const admin = createAdminClient()
const { data, error } = await admin
  .from('table')
  .insert({ organization_id: orgId, ... })   // ← always include orgId explicitly
  .eq('organization_id', orgId)              // ← and scope updates/deletes
```

### `safeQuery` for server-side page queries
```typescript
const { data, error } = await safeQuery(() =>
  supabase.from('table').select('...').eq('organization_id', orgId)
)
if (error) console.error('[module page] query error:', error)
const initialData: Thing[] | null = error ? null : (data as Thing[])
// Pass null to client → client falls back to its own fetch
```

---

## Memory Files Referenced
- `project_forge_phase1.md` — 10-phase build plan
- `FORGE_SESSION_SUMMARY.md` — previous full implementation session
- `project_forge_audit_2026.md` — April 2026 audit (9 issues)
- `project_forge_completion_2026.md` — 10 features completed April 2026
- `project_forge_hardening_may2026.md` — this session's hardening work

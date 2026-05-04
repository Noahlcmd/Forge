# Forge App — Session Summary
**Date:** 2026-05-03  
**Project:** Next.js 14 SaaS dashboard ("Forge")  
**Working directory:** `C:\Users\noahl\Desktop\Forge-app`  
**GitHub:** `https://github.com/Noahlcmd/Forge` ← correct username is `Noahlcmd`  
**Git branch:** `main` (2 commits: `10e92aa`, `37e196e`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Auth pattern | `createClient()` = RLS-scoped; `createAdminClient()` = service role |
| Validation | Zod on all API routes |
| Email | Resend (`resend` npm package v6.12.2) |
| Payments | Stripe (subscription billing + webhooks) |
| AI | Anthropic API (`claude-haiku-4-5-20251001`) |
| Language | TypeScript strict — 0 errors confirmed |
| Styling | Tailwind CSS |

---

## Session Work: What Was Built

### 1. AI Assistant Module (replaces Internal Wiki)

**Renamed:** `wiki` → `ai-assistant` throughout the codebase.

**Files created/changed:**
- `src/lib/modules.ts` — module id/name/href/description updated
- `src/components/layout/Sidebar.tsx` — nav entry updated, `BookOpen` → `Bot` icon
- `src/app/(dashboard)/workspace/ai-assistant/page.tsx` — server component with auth + module gate
- `src/app/(dashboard)/workspace/ai-assistant/AIAssistantClient.tsx` — full chat UI
- `src/app/api/ai/chat/route.ts` — POST API route

**How the AI chat works:**
- User sends a message via the chat UI
- API fetches 5 data sources in parallel (customers, leads, campaigns, transactions, pipeline_deals), all scoped to `organization_id`
- Builds a structured JSON context object with real org numbers
- Sends system prompt + context + user message to `claude-haiku-4-5-20251001`
- Returns a text reply referencing real data
- UI supports: suggested prompts, auto-scroll, Enter-to-send, Shift+Enter newline, clear conversation, error banner

**Security:** `org_id` always derived from authenticated session's `memberships` row — never from request body. All 5 queries have `.eq('organization_id', orgId)`.

**Note on module IDs:** Users who had `wiki` in `enabled_modules` in DB need:
```sql
UPDATE organizations SET enabled_modules = array_replace(enabled_modules, 'wiki', 'ai-assistant');
```

---

### 2. Production Invite System

**Full end-to-end invite flow implemented.**

#### Database (`supabase/migrations/020_invitations_v2.sql`)
- Added `revoked_at timestamptz` column for soft-deletes
- Changed `expires_at` default: **7 days → 24 hours**
- Added `UNIQUE` constraint on `token`
- Fixed RLS `UPDATE` policy — previously invitees couldn't accept because they had no membership yet; new policy allows email-matched users to update their own invite

Run this migration in Supabase SQL editor.

#### API Routes Created

| Route | Method | Purpose |
|---|---|---|
| `/api/team/invite` | POST | Create invite + send Resend email; falls back to returning copyable link |
| `/api/team/invites` | GET | List pending (not accepted, not revoked, not expired) invites for org |
| `/api/team/invites/[id]` | DELETE | Revoke invite (sets `revoked_at`) |
| `/api/team/invites/[id]/resend` | POST | Regenerate token + reset 24h expiry + resend email |
| `/api/invite/accept` | POST | Validate token, check email match, upsert membership, mark invite accepted |

#### New Public Page: `/accept-invite`
- Server component at `src/app/accept-invite/page.tsx`
- Client component at `src/app/accept-invite/AcceptInviteClient.tsx`
- Reads `?token=` from URL, looks up invite via admin client
- **Logged in + email matches** → "Join [Org]" button → POST → redirect to `/dashboard`
- **Logged in + wrong email** → error message explaining which email was invited
- **Logged out** → two buttons: "Create account to join" and "Sign in instead" — both carry `?next=/accept-invite?token=xxx` through the auth flow

#### Middleware updated (`src/middleware.ts`)
- `/accept-invite` added to both the matcher exclusion AND `isAuthPage` check so unauthenticated users can access it

#### Auth Forms updated
- `SignupForm` and `LoginForm` now accept a `next` prop
- Thread `?next=` through email confirmation `redirectTo` so new users land back on accept-invite page after verifying email
- `LoginPage` and `SignupPage` both read `searchParams.next`

#### Email utility (`src/lib/email.ts`)
- Uses Resend SDK (`new Resend(process.env.RESEND_API_KEY)`)
- Sends HTML invite email with org name, inviter name, role, and 24h expiry note
- Falls back gracefully if `RESEND_API_KEY` not set — returns invite link for admin to copy

#### Team UI (`src/app/(dashboard)/team/TeamClient.tsx`)
- New **"Pending Invites" tab** with badge count
- Shows: email, role chip, "expires in Xh", inviter name
- **Resend** button with spinner — regenerates token, shows copy-link fallback
- **Revoke** button — removes invite from list immediately
- Fallback invite link banner with one-click copy

#### Security guarantees:
- `org_id` always from session — never from request body
- Token is single-use: `accepted_at` set on accept, checked before processing
- Email must match logged-in user's profile email
- Revoked and expired invites return explicit errors
- All mutations scoped to `organization_id` to prevent cross-org tampering

---

## Git State

```
branch: main
commits:
  37e196e  remove claude local settings
  10e92aa  initial commit (222 files)

remote: origin → https://github.com/Noahlcmd/Forge.git  ← CORRECT
```

**Previous remote was wrong:** `Noah1cmd/Forge` — this was corrected to `Noahlcmd/Forge`.  
**Push succeeded** — repo is no longer empty.

---

## Environment Variables

All variables confirmed from `.env.local`. These must be added to Vercel:

### Required (app will not work without these)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ubwqbxwwguhwuldyukra.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT from Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT — never expose to client |
| `STRIPE_SECRET_KEY` | `sk_test_...` — switch to `sk_live_...` for production |
| `STRIPE_PRICE_ID` | `price_1TOi0O3SlsvY2ovWdg5qUgYY` |
| `STRIPE_PRICE_TEST` | `price_1TOi0O3SlsvY2ovWdg5qUgYY` |
| `STRIPE_PRICE_STANDARD` | `price_1TOi0O3SlsvY2ovWdg5qUgYY` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` — create new one for prod Vercel webhook |
| `NEXT_PUBLIC_APP_URL` | **Must be your actual Vercel URL after deploy** — not localhost |

### Optional (features degrade gracefully without these)

| Variable | Feature |
|---|---|
| `ANTHROPIC_API_KEY` | AI Assistant + AI Campaign Builder — returns 500 without it |
| `RESEND_API_KEY` | Invite emails — falls back to returning a copyable link |
| `RESEND_FROM_EMAIL` | e.g. `Forge <noreply@yourdomain.com>` |
| `GOOGLE_CLIENT_ID` | Google Calendar integration |
| `GOOGLE_CLIENT_SECRET` | Google Calendar integration |

---

## Vercel Deployment Checklist

1. **Deploy to Vercel** — import `Noahlcmd/Forge`, add all env vars, deploy
2. **After deploy — copy your Vercel URL** (e.g. `forge-xyz-noahlcmd.vercel.app`)
3. **Update `NEXT_PUBLIC_APP_URL`** in Vercel env vars to the real URL → redeploy
4. **Supabase Auth settings:**
   - Go to Supabase → Authentication → URL Configuration
   - Set Site URL to your Vercel URL
   - Add Redirect URL: `https://your-vercel-url.vercel.app/auth/callback`
   - Add Redirect URL: `https://your-vercel-url.vercel.app/**`
5. **Stripe webhook** — create new webhook in Stripe dashboard:
   - Endpoint: `https://your-vercel-url.vercel.app/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copy the new `whsec_...` secret → update `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Known Patterns / Architecture

### Auth pattern in server pages
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
  // get orgId from memberships, never from request body
  const { data: membership } = await supabase
    .from('memberships').select('organization_id, role').eq('user_id', user.id).maybeSingle()
  if (!membership?.organization_id) return apiErr('No organization', 400)
  // all queries: .eq('organization_id', orgId)
})
```

### Admin client for writes
```typescript
const admin = createAdminClient()
await admin.from('table').insert({ organization_id: orgId, ...data })
// PATCH/DELETE: always scope with .eq('organization_id', orgId) too
```

### Key safety utilities (`src/lib/safe-server.ts`)
- `withSafeHandler` — wraps all route handlers, uncaught exceptions → clean 500
- `safeQuery` — wraps Supabase queries, never throws
- `enforceOrgQuery` — throws before DB hit if orgId is falsy
- `apiOk` / `apiErr` — standard response helpers

### Tenant isolation layers
1. **DB (RLS):** `using (organization_id in (select public.my_org_ids()))`
2. **API session:** `orgId` always from `memberships` via auth session
3. **Query scope:** every `.from(table)` has `.eq('organization_id', orgId)`
4. **ID mutations:** all PATCH/DELETE use both `.eq('id', params.id).eq('organization_id', orgId)`

---

## File Structure (key paths)

```
src/
  app/
    (auth)/
      login/page.tsx          ← now reads searchParams.next
      signup/page.tsx         ← now reads searchParams.next
    (dashboard)/
      team/
        page.tsx              ← fetches members + pending invites
        TeamClient.tsx        ← Members + Pending Invites + Permissions tabs
      workspace/
        ai-assistant/
          page.tsx
          AIAssistantClient.tsx
    accept-invite/
      page.tsx                ← public page, reads ?token=
      AcceptInviteClient.tsx
    api/
      ai/
        chat/route.ts         ← NEW: AI business advisor
      team/
        invite/route.ts       ← rewritten: Resend email, 24h token
        invites/route.ts      ← NEW: GET pending invites
        invites/[id]/route.ts ← NEW: DELETE revoke
        invites/[id]/resend/route.ts ← NEW: POST resend
      invite/
        accept/route.ts       ← NEW: POST accept
  components/
    auth/
      LoginForm.tsx           ← updated: next prop
      SignupForm.tsx          ← updated: next prop
    layout/
      Sidebar.tsx             ← wiki → ai-assistant
  lib/
    email.ts                  ← NEW: Resend invite email utility
    modules.ts                ← wiki → ai-assistant
    safe-server.ts            ← withSafeHandler, safeQuery, enforceOrgQuery
  middleware.ts               ← /accept-invite added to public routes
supabase/
  migrations/
    020_invitations_v2.sql    ← NEW: revoked_at, 24h expiry, token unique, RLS fix
```

---

## Migrations to Run in Supabase

Run in order in the Supabase SQL editor:

1. `supabase/migrations/020_invitations_v2.sql` — **required for invite system**

If using the AI assistant, all data tables (`customers`, `leads`, `campaigns`, `transactions`, `pipeline_deals`) must exist — they're created by migrations 001–019.

---

## Outstanding Items / Next Steps

1. **Run migration 020** in Supabase SQL editor
2. **Deploy to Vercel** (see checklist above)
3. **Update Supabase redirect URLs** to Vercel domain
4. **Create Stripe webhook** for Vercel URL
5. **Add `ANTHROPIC_API_KEY`** to Vercel env vars for AI features
6. **Add `RESEND_API_KEY`** + `RESEND_FROM_EMAIL` for invite emails
7. **Update module IDs in DB** if any org has `wiki` in `enabled_modules`:
   ```sql
   UPDATE organizations SET enabled_modules = array_replace(enabled_modules, 'wiki', 'ai-assistant');
   ```
8. **Test invite flow end-to-end:** invite a real email → accept → confirm org join

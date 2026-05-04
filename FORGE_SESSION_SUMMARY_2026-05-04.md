# Forge App — Session Summary
**Date:** 2026-05-04  
**Project:** Next.js 14 SaaS dashboard ("Forge")  
**Working directory:** `C:\Users\noahl\Desktop\Forge-app`  
**GitHub:** `https://github.com/Noahlcmd/Forge`  
**Production URL:** `https://forge-topaz-nu.vercel.app`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Auth pattern | `createClient()` = RLS-scoped; `createAdminClient()` = service role |
| Validation | Zod on all API routes |
| Email | Resend (`resend` npm package) |
| Payments | Stripe (subscription billing + webhooks) |
| AI | Anthropic API (`claude-haiku-4-5-20251001`) |
| Language | TypeScript strict |
| Styling | Tailwind CSS |

---

## Git State

```
branch: main
remote: origin → https://github.com/Noahlcmd/Forge.git

Recent commits:
e4a1c79  fix: make all auth redirects use NEXT_PUBLIC_APP_URL
c10ba07  fix: resolve ESLint build errors blocking Vercel deployment
2cf9750  (earlier)
37e196e  remove claude local settings
10e92aa  initial commit
```

---

## Session Work

### 1. ESLint Build Errors Fixed (blocking Vercel deploy)

**Problem:** `npm run build` was failing with 4 ESLint errors.

**Fixes applied:**

| File | Error | Fix |
|---|---|---|
| `src/app/(dashboard)/chat/ChatClient.tsx:511` | Unescaped `"` in JSX | Wrapped string in `{' '}` curly braces |
| `src/lib/safe-server.ts:58,60,122` | `@typescript-eslint/no-explicit-any` rule not found (plugin not installed) | Removed the `eslint-disable-next-line` comments entirely |

Build now passes clean — all 50 routes compile, warnings only (pre-existing `<img>` tag warnings, not errors).

---

### 2. Production Auth Bug Fixed (magic links → localhost)

**Problem:** Magic link emails redirected to `http://localhost:3000` instead of `https://forge-topaz-nu.vercel.app`, breaking login completely in production.

**Root cause (two-part):**
1. `LoginForm`, `SignupForm`, `ResetPasswordForm` used `window.location.origin` to construct `emailRedirectTo` — fragile, bypasses the canonical env var
2. Supabase's "Site URL" was still `http://localhost:3000` and the production URL wasn't in the Redirect URLs whitelist — so Supabase ignored `emailRedirectTo` and fell back to the Site URL

**Code fixes:**

**New file: [`src/lib/app-url.ts`](src/lib/app-url.ts)**
```ts
export function getAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:3000'
}
```
Priority: `NEXT_PUBLIC_APP_URL` → `window.location.origin` → localhost fallback.

**Updated files:**

| File | Change |
|---|---|
| `src/components/auth/LoginForm.tsx` | Import + use `getAppUrl()` instead of `window.location.origin` for `emailRedirectTo` |
| `src/components/auth/SignupForm.tsx` | Same |
| `src/components/auth/ResetPasswordForm.tsx` | Same for password reset `redirectTo` |
| `src/app/auth/callback/route.ts` | Use `NEXT_PUBLIC_APP_URL ?? origin` as `base` for all post-auth redirects |
| `src/app/api/billing/checkout/route.ts` | `requestOrigin()` now checks `NEXT_PUBLIC_APP_URL` first before falling back to request headers |

---

## Required Manual Step — Supabase Dashboard

**The code fix alone is not enough.** Supabase controls redirect whitelisting server-side.

Go to: **Supabase Dashboard → Authentication → URL Configuration**  
Project ref: `ubwqbxwwguhwuldyukra`

1. **Site URL** → change to: `https://forge-topaz-nu.vercel.app`
2. **Redirect URLs** → add:
   - `https://forge-topaz-nu.vercel.app/**`
   - `http://localhost:3002/**`

Without this, Supabase ignores `emailRedirectTo` and falls back to the Site URL regardless of what the code sends.

---

## Environment Variables

All values confirmed in `.env.local`. Must be set in Vercel:

### Required

| Variable | Value/Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ubwqbxwwguhwuldyukra.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT from Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT — never expose to client |
| `NEXT_PUBLIC_APP_URL` | `https://forge-topaz-nu.vercel.app` |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_PRICE_ID` | `price_1TOi0O3SlsvY2ovWdg5qUgYY` |
| `STRIPE_PRICE_TEST` | `price_1TOi0O3SlsvY2ovWdg5qUgYY` |
| `STRIPE_PRICE_STANDARD` | `price_1TOi0O3SlsvY2ovWdg5qUgYY` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` — create new one for Vercel endpoint |

### Optional

| Variable | Feature |
|---|---|
| `ANTHROPIC_API_KEY` | AI Assistant + AI Campaign Builder |
| `RESEND_API_KEY` | Invite emails (falls back to copyable link) |
| `RESEND_FROM_EMAIL` | e.g. `Forge <noreply@yourdomain.com>` |
| `GOOGLE_CLIENT_ID` | Google Calendar integration |
| `GOOGLE_CLIENT_SECRET` | Google Calendar integration |

---

## Outstanding Items

1. **Supabase URL config** — update Site URL + Redirect URLs (see above) — **CRITICAL for auth**
2. **Vercel deploy** — auto-triggered by the git push; confirm build passes in Vercel dashboard
3. **Stripe webhook** — create webhook endpoint in Stripe dashboard:
   - URL: `https://forge-topaz-nu.vercel.app/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
   - Copy new `whsec_...` → update `STRIPE_WEBHOOK_SECRET` in Vercel env vars
4. **Test auth end-to-end** after Supabase config is updated

---

## Key Architecture Patterns

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
  const { data: membership } = await supabase
    .from('memberships').select('organization_id, role').eq('user_id', user.id).maybeSingle()
  if (!membership?.organization_id) return apiErr('No organization', 400)
  // all queries: .eq('organization_id', orgId)
})
```

### Tenant isolation layers
1. **DB (RLS):** `using (organization_id in (select public.my_org_ids()))`
2. **API session:** `orgId` always from `memberships` via auth session — never from request body
3. **Query scope:** every `.from(table)` has `.eq('organization_id', orgId)`
4. **ID mutations:** all PATCH/DELETE use both `.eq('id', params.id).eq('organization_id', orgId)`

### Key safety utilities (`src/lib/safe-server.ts`)
- `withSafeHandler` — wraps all route handlers, uncaught exceptions → clean 500
- `safeQuery` — wraps Supabase queries, never throws
- `enforceOrgQuery` — throws before DB hit if orgId is falsy
- `apiOk` / `apiErr` — standard response helpers

### App URL utility (`src/lib/app-url.ts`)
- `getAppUrl()` — use everywhere a base URL is needed in auth flows

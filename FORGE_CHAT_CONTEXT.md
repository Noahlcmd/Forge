# Forge App — Chat Context Summary

## What This App Is

Forge is a Next.js 14 SaaS dashboard for small business operators. It uses:
- **Next.js 14 App Router** (server components by default, `'use client'` where needed)
- **Supabase** (`@supabase/ssr`) for auth + database
- **Tailwind CSS v3.4** + CSS custom properties for theming
- **TypeScript** strict mode
- **Stripe** for billing (webhooks + portal)

---

## Design System

### Theme: Dark Sidebar + Light Content

Auth pages use a dark background (`bg-[#09090b] text-zinc-50`).  
Dashboard pages use a split layout: dark sidebar + light content area.

### CSS Custom Properties (defined in `src/app/globals.css`)

```css
--sidebar-bg:     #111318
--sidebar-text:   #9499a5
--sidebar-hover:  #1e2128
--sidebar-active: #252932
--sidebar-border: #1e2128

--topbar-bg:    #ffffff
--topbar-border:#f0f0f0
--content-bg:   #f7f8fa
--card-bg:      #ffffff
--card-border:  #eaedf2

--text-primary:   #0d0e12
--text-secondary: #6b7280
--text-muted:     #9ca3af

--shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
--shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)

--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px

--color-primary: #f97316   ← hex, NOT space-separated RGB
--color-accent:  #f97316   ← overridden by ThemeProvider at runtime
```

### Reusable CSS Classes (in `@layer components` in globals.css)

| Class | Use |
|---|---|
| `.forge-card` | White card with border, radius, shadow |
| `.forge-input` | Light input field (focus ring uses `--color-primary`) |
| `.btn` | Base button (inline-flex, gap, padding, radius) |
| `.btn-primary` | Orange fill button |
| `.btn-secondary` | White/border button |
| `.btn-sm` | Smaller padding/font |
| `.chip` | Inline status pill |
| `.chip-green/red/amber/blue/gray/purple` | Colored chip variants |

### `.forge-content` Class

Applied to the right-hand column in the dashboard layout. Sets:
```css
background: var(--content-bg);
color: var(--text-primary);
```

---

## Project Structure

```
src/
  app/
    (auth)/               ← login, signup, reset-password, update-password
    (dashboard)/
      layout.tsx          ← Root dashboard layout: Sidebar + Topbar + forge-content main
      error.tsx           ← Root dashboard error boundary
      dashboard/          ← Main dashboard (KPIs, bar chart, activity, quick actions)
      customers/          ← Customer table + AddCustomerForm
      leads/              ← Leads table + AddLeadForm
      outreach/           ← Outreach sequences table
      ads/                ← AI Campaign Builder (CampaignBuilder.tsx)
      finding-clients/    ← Lead scoring/finding tools
      workspace/          ← Module toggle grid (WorkspaceClient.tsx)
      workspace/[module]/ ← Individual workspace module page
      settings/           ← Tabbed settings (General, Appearance, Modules, Team)
      calendar/           ← Placeholder
      chat/               ← Placeholder
      finances/           ← Placeholder
    api/
      ai/campaign/        ← AI campaign generation endpoint
      billing/            ← Stripe checkout, portal, webhook, status, validate
      customers/          ← CRUD
      leads/              ← CRUD
      outreach/           ← CRUD
      profile/            ← Update profile
      onboarding/complete ← Post-onboarding module activation
      settings/modules/   ← Save enabled_modules
      debug/activate/     ← Dev-only subscription activation
    globals.css
    layout.tsx            ← Root layout (Geist font, dark body for auth)
    page.tsx              ← Redirects to /dashboard
    auth/callback/        ← Supabase OAuth callback
  components/
    layout/
      Sidebar.tsx         ← Section-switching dark sidebar
      Topbar.tsx          ← White 52px topbar (breadcrumb, search, org, bell, avatar)
      SectionShell.tsx    ← Simple shell used by some pages
    auth/                 ← LoginForm, SignupForm, ResetPasswordForm, UpdatePasswordForm
    ui/                   ← Button, Input, PasswordInput
  lib/
    auth/getAppUser.ts    ← Central auth helper (dual-query resilient)
    supabase/
      client.ts           ← Browser Supabase client
      server.ts           ← Server Supabase client (uses cookies)
    modules.ts            ← Module registry + computeEnabledModules()
    utils.ts              ← cn() and helpers
  middleware.ts           ← Auth middleware (protects /dashboard/* routes)
  types/index.ts          ← Shared TypeScript types
supabase/
  migrations/             ← SQL migration files
  schema.sql
```

---

## Key Patterns

### Auth Helper: `getAppUser()`

Located at `src/lib/auth/getAppUser.ts`. Returns `{ ok: true, profile, membership }` or `{ ok: false, error }`.

- **Dual-query resilient**: tries full query first (with new migration columns), falls back to minimal query if columns don't exist yet (prevents crashes during migration rollout).
- Always use this on server components/routes instead of calling Supabase directly.
- `membership.organizations.enabled_modules` — JSONB string array of enabled module IDs.

### Module System

Defined in `src/lib/modules.ts`:
- `MODULES` — full registry of all modules with `id`, `name`, `description`, `icon`, `bg`, `color`, `href`, `workspace` flag
- `MODULE_MAP` — keyed by module id
- `computeEnabledModules(businessType, opsAnswers)` — called post-onboarding to activate relevant modules
- **Convention**: empty `enabled_modules` array = pre-onboarding = show everything. Non-empty = only show what's listed.
- Use `hasModule(id)` pattern: `const show = enabled.length === 0 || enabled.includes(id)`

### Sidebar Navigation (`src/components/layout/Sidebar.tsx`)

Three sections detected from URL prefix:
- `/dashboard`, `/customers`, `/leads`, `/outreach`, `/finding-clients`, `/calendar`, `/chat`, `/finances` → `'dashboard'` section
- `/ads` → `'ads'` section  
- `/workspace`, `/settings` → `'workspace'` section

Section switcher at top renders 3 `<Link>` buttons. Nav items filter by `enabled_modules`.

Active nav item detection: `pathname === href || pathname.startsWith(href + '/')`

Accent indicator: absolute-positioned 3px orange left bar on active item.

### Topbar (`src/components/layout/Topbar.tsx`)

`'use client'` — uses `usePathname()` for breadcrumb auto-detection via `ROUTE_LABELS` map. No `Header.tsx` is used anywhere — Topbar is global in `(dashboard)/layout.tsx`.

### Dashboard Layout (`src/app/(dashboard)/layout.tsx`)

Two auth gates:
1. Minimal subscription check (pre-migration safe) — redirects to `/login` or `/billing` if needed
2. Full `getAppUser()` for sidebar data + theme

Right column: `<div className="forge-content">` wrapping `<main style={{ background: 'var(--content-bg)' }}>`.

---

## Critical Infrastructure Fixes Made This Session

### 1. Tailwind Not Applying (Root Cause: `postcss.config.mjs`)

`postcss-load-config v6` + Next.js 14 internal PostCSS pipeline fails **silently** with `.mjs` (ES module) PostCSS config on Windows. No error is thrown — styles just don't compile.

**Fix**: Delete `postcss.config.mjs`, create `postcss.config.js` with CommonJS syntax:
```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

### 2. `next.config.mjs` Was Deleted

`serverExternalPackages` was removed when the `.mjs` config was deleted. Without it, Stripe and Supabase crash with `__webpack_require__ is not a function`.

**Fix**: Create `next.config.js` (CommonJS):
```js
const nextConfig = {
  serverExternalPackages: ['stripe', '@supabase/supabase-js'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }] },
}
module.exports = nextConfig
```

### 3. `--color-primary` Format

Must be **hex** (`#f97316`), NOT space-separated RGB (`249 115 22`). All inline styles use `var(--color-primary, #f97316)`. Tailwind utilities (e.g. `bg-[--color-primary]`) are not used — CSS vars are applied via inline `style` props or the `.btn-primary` component class.

### 4. `Set<string>` Iteration (TS2802)

TypeScript target (`ES5`/`ES2015`) doesn't support spreading a `Set` without `downlevelIteration`. Fixed by using `Array.from()` in:
- `src/lib/modules.ts` — `return Array.from(extras)`
- `src/app/(dashboard)/settings/ModulesTab.tsx`
- `src/app/(dashboard)/workspace/WorkspaceClient.tsx`

### 5. Supabase Join Type (TS2352)

Supabase relational queries can return either a single object or an array depending on the join type. Use:
```ts
Array.isArray(orgData) ? orgData[0]?.subscription_status : orgData?.subscription_status
```

---

## Files With Loading/Error States

Every page under `(dashboard)` now has a `loading.tsx` skeleton (animate-pulse, forge-card structure). Error boundaries exist for: `dashboard`, `customers`, `leads`, `outreach`, and the root `(dashboard)/error.tsx`.

---

## Form Convention

All forms in the light content area use:
- `forge-card p-5` wrapper (NOT `bg-zinc-900 border-zinc-700`)
- `forge-input` class on all `<input>` elements (NOT `bg-zinc-800 border-zinc-700 text-zinc-100`)
- Labels: `style={{ color: 'var(--text-secondary)' }}`
- Submit: `btn btn-primary`, Cancel: `style={{ color: 'var(--text-muted)' }}`
- Error text: `text-red-500` (NOT `text-red-400`)

---

## What's NOT Yet Built

- `calendar/page.tsx` — placeholder only
- `chat/page.tsx` — placeholder only
- `finances/page.tsx` — placeholder only
- Real ad platform integration in `CampaignBuilder` (currently simulates launch with `setTimeout`)
- Full workspace module pages — `workspace/[module]/page.tsx` shows a "coming soon" card
- Team management in settings (`TeamTab.tsx`) — UI exists, invite flow not wired
- Appearance tab ThemeProvider — tab exists but CSS var override at runtime not implemented

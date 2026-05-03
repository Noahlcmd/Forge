# Forge App — Full Context Summary

## Project Overview

**Forge** is a SaaS business management platform built with:
- **Next.js 14 App Router** (server components + `'use client'` for interactivity)
- **Supabase** (PostgreSQL + Auth + RLS + Storage) — Project ID: `ubwqbxwwguhwuldyukra`
- **Tailwind CSS** + custom CSS variables (design tokens in `globals.css`)
- **TypeScript** (strict, zero errors enforced)
- **Resend** for email
- **react-hot-toast** for toasts (`position="bottom-right"`, `duration: 10000`)

Working directory: `C:\Users\noahl\Desktop\Forge-app`

---

## Tech Stack Details

### Supabase Clients
- `src/lib/supabase/server.ts` — user-scoped client (respects RLS)
- `src/lib/supabase/admin.ts` — service-role client (bypasses RLS, used for privileged writes)
- `src/lib/auth/getAppUser.ts` — server helper that returns `{ ok, profile, membership }` or `{ ok: false }`

### CSS Design Tokens (`src/app/globals.css`)
```css
--sidebar-bg, --sidebar-text, --sidebar-hover, --sidebar-active, --sidebar-border
--topbar-bg, --topbar-border, --content-bg, --card-bg, --card-border
--text-primary, --text-secondary, --text-muted
--shadow-sm, --shadow-md
--radius-sm (6px), --radius-md (10px), --radius-lg (14px)
--color-primary, --color-accent, --color-primary-alpha   ← overridden at runtime by ThemeProvider
--input-bg, --input-border, --surface-subtle
```
Dark mode: `html.dark` class toggled by `ThemeProvider`.

### CSS Component Classes
- `.forge-card` — white card with border + shadow
- `.forge-input` — adaptive input (light + dark)
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm` — button variants
- `.chip`, `.chip-green`, `.chip-red`, `.chip-amber`, `.chip-blue`, `.chip-gray`, `.chip-purple`

### Currency
- `formatMoney(cents, currency)` from `@/lib/currency` — the ONLY formatter. Never use inline `Intl.NumberFormat`.

### Theme
- `src/components/layout/ThemeProvider.tsx` sets `--color-primary`, `--color-accent`, `--color-primary-alpha`, `data-sidebar-style`, `data-card-style`, `data-density`, `data-font`, and `html.dark` class at runtime from org settings.

---

## Database Schema

### Core Tables
| Table | Key Columns |
|---|---|
| `organizations` | id, name, slug, plan, accent_color, sidebar_style, etc. |
| `profiles` | id (= auth.uid), full_name, email, avatar_url |
| `memberships` | id, organization_id, user_id, role (owner/admin/employee), accepted_at |
| `invitations` | id, organization_id, email, role, token, invited_by, accepted_at, expires_at |

### Business Tables
| Table | Key Columns |
|---|---|
| `customers` | id, organization_id, name, email, company, phone, status, notes |
| `leads` | id, organization_id, name, email, company, stage, score, notes |
| `campaigns` | id, organization_id, name, platform, status, budget, spend, impressions, clicks |
| `outreach` | id, organization_id, name, status, from_name, from_email |
| `notifications` | id, organization_id, user_id (nullable), title, description, link, read |
| `integrations` | id, organization_id, provider, status, credentials (jsonb), metadata (jsonb) |

### Workspace Tables
| Table | Key Columns |
|---|---|
| `projects` | id, organization_id, name, status, client_name, due_date, budget, notes, created_by |
| `tasks` | id, organization_id, title, status (todo/in_progress/done), due_date, notes, created_by |
| `notes` | id, organization_id, title, content, created_by |
| `wiki_pages` | id, organization_id, title, slug, content, created_by; UNIQUE(org_id, slug) |
| `files` | id, organization_id, name, file_url, file_type, file_size, notes, created_by |
| `equipment` | id, organization_id, name, status (active/maintenance/retired), serial_number, location |
| `suppliers` | id, organization_id, name, contact_name, email, phone, notes |
| `inventory_items` | id, organization_id, name, sku, quantity, unit_cost |
| `pipeline_deals` | id, organization_id, name, stage, value, contact_name |

### Chat Tables
| Table | Key Columns |
|---|---|
| `chat_channels` | id, organization_id, name, slug, description, is_default, is_pinned (bool default false), created_by |
| `chat_messages` | id, organization_id, channel_id, user_id, content (max 4000 chars) |
| `channel_memberships` | id, channel_id, user_id, left_at (nullable); UNIQUE(channel_id, user_id) |

### Calendar / Events
| Table | Key Columns |
|---|---|
| `calendars` | id, organization_id, name, color, is_default |
| `calendar_events` | id, organization_id, calendar_id, title, start_at, end_at, all_day, notes |

### RLS Pattern
All tables use RLS. The helper function `public.my_org_ids()` (security-definer) returns the org IDs for the current user. Policies use:
```sql
using (organization_id in (select public.my_org_ids()))
```
Admin writes always use `createAdminClient()` which bypasses RLS.

---

## Applied Migrations (in order)
| Migration | What it does |
|---|---|
| `001_customers` | customers table |
| `002_leads` | leads table |
| `005_invitations` | invitations table + RLS |
| `007_chat_channels_messages` | chat_channels, chat_messages + RLS |
| `010_notifications` | notifications table |
| `016_workspace_module_tables` | workspace modules config |
| `017_files_crm_pipelines` | files, pipeline_deals tables |
| `018_workspace_tables` | tasks, notes, equipment, suppliers, wiki_pages; ALTER projects (client_name/budget/notes); DROP NOT NULL on notifications.user_id |
| `019_wiki_pages` | wiki RLS idempotent fix |
| `020_chat_controls` | ADD is_pinned to chat_channels; CREATE channel_memberships |

---

## App Routes

### Auth (no layout)
- `/login`, `/signup`, `/reset-password`, `/update-password`

### Dashboard (sidebar + topbar layout)
All under `src/app/(dashboard)/`:
- `/dashboard` — overview cards
- `/customers` — customer list
- `/leads` — leads pipeline
- `/finding-clients` — lead discovery tools
- `/outreach` — email sequences
- `/finances` — invoices / P&L
- `/calendar` — monthly calendar with events
- `/chat` — team chat with channels
- `/ads` — campaign manager
- `/workspace` — module hub
- `/workspace/projects`, `/workspace/tasks`, `/workspace/notes`
- `/workspace/wiki`, `/workspace/files`, `/workspace/equipment`
- `/workspace/suppliers`, `/workspace/inventory`, `/workspace/crm-pipelines`
- `/settings` — profile, appearance, team, integrations, modules tabs
- `/reports` — analytics

### Layout Components
- `src/components/layout/Sidebar.tsx` — dynamic nav from enabled workspace modules
- `src/components/layout/Topbar.tsx` — breadcrumb, search (debounced 350ms), notifications bell, user avatar
- `src/components/layout/SectionShell.tsx` — page wrapper with title/subtitle/actions
- `src/components/layout/ThemeProvider.tsx` — applies CSS vars + dark mode + font

---

## Key API Routes

### Chat
- `GET/POST /api/chat/channels` — list channels / create channel
- `PATCH /api/chat/channels/[id]` — update is_pinned or name (org-scoped)
- `DELETE /api/chat/channels/[id]` — delete channel + all messages (admin/owner only)
- `POST /api/chat/channels/[id]/leave` — upserts channel_memberships with left_at
- `GET/POST /api/chat/messages` — list messages for channel / send message

### Files
- `GET/POST /api/files` — list files / add link
- `POST /api/files/upload` — multipart upload to Supabase Storage bucket `org-files` (max 20MB)
- `PATCH/DELETE /api/files/[id]` — update metadata / delete from DB + storage cleanup

### Notifications
- `GET /api/notifications` — latest 30 for org, newest first
- `PATCH /api/notifications` — mark all read (or specific `{ id }` if provided)

### Search
- `GET /api/search?q=` — searches customers, leads, campaigns (min 2 chars, strips `,()` to prevent filter injection, org-scoped, 5 results per type)

### Integrations
- `GET/POST /api/settings/integrations` — list / upsert integration status
- `GET /api/integrations/google/auth` — starts Google OAuth (state = base64url `{ userId, ts }`)
- `GET /api/integrations/google/callback` — exchanges code, validates CSRF state (userId match + 10min TTL), stores tokens

### Team
- `POST /api/team/invite` — creates invitation record, tries Supabase auth invite, falls back to invite link

### Outreach
- `POST /api/outreach/[id]/send-test` — sends test email via Resend

---

## Chat System Architecture

### How channels work
1. On first load, if no channels exist, client auto-provisions 4 default channels via API
2. Server page orders channels: `is_pinned DESC, created_at ASC`
3. Server page filters out channels the user has left (via `channel_memberships` where `left_at IS NOT NULL`)
4. Messages poll every 4 seconds via `setInterval` with proper cleanup on unmount / channel switch

### 3-dot menu (per channel row, appears on hover)
- **Pin / Unpin**: `PATCH /api/chat/channels/[id]` with `{ is_pinned: bool }` → re-sorts list client-side
- **Leave**: `POST /api/chat/channels/[id]/leave` → removes from visible list, switches to next channel
- **Delete** (admin/owner only): `DELETE /api/chat/channels/[id]` with confirm dialog → removes from list

### User role
`userRole` passed from `page.tsx` (`result.membership.role`) → `ChatClient` prop → controls Delete visibility.

---

## Security Rules

1. **orgId always comes from the authenticated user's membership** — never from request params or body
2. **Admin client writes always include `.eq('organization_id', orgId)`** — defense in depth
3. **Google OAuth CSRF**: callback validates `state` (userId + ts, must match current user, < 10 min old)
4. **Search filter injection**: strips `,()` from query before using in PostgREST `.or()` string
5. Full audit of all 53 API routes confirmed org-scoped with no missing filters

---

## Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL         # e.g. https://yourapp.com
GOOGLE_CLIENT_ID            # for Google Calendar OAuth
GOOGLE_CLIENT_SECRET
RESEND_API_KEY              # for outreach email sending
ANTHROPIC_API_KEY           # for AI campaign generation
```

---

## Supabase Storage
- Bucket: `org-files` (public, 20MB limit per file)
- Auto-created on first upload if missing
- File path format: `{orgId}/{uuid}-{sanitizedName}`
- Delete extracts storage path from public URL and calls `storage.remove()`

---

## Bugs Fixed (all sessions combined)

| # | Bug | Fix |
|---|---|---|
| 1 | `projects.client_name` column missing | `ALTER TABLE projects ADD COLUMN IF NOT EXISTS` |
| 2 | `notifications.user_id NOT NULL` blocked org-level inserts | `ALTER COLUMN user_id DROP NOT NULL` |
| 3 | `--color-primary-alpha` CSS var undefined | Defined in `:root`, `html.dark`, and ThemeProvider |
| 4 | Calendar selected day showed near-white | Use `var(--color-primary-alpha)` / `var(--color-primary)` |
| 5 | Notification bell unread count not persisting | Bell open fires GET + PATCH in parallel |
| 6 | Sidebar missing 4 workspace nav items | Added tasks, notes, files, crm-pipelines |
| 7 | `invitations` table missing from DB | Applied migration 005 via MCP |
| 8 | `chat_channels` / `chat_messages` missing | Applied migration 007 via MCP; fixed `any()` → `in (select ...)` in RLS |
| 9 | "Retry via client" warnings on 9 workspace pages | Removed warning blocks |
| 10 | Google OAuth CSRF state not validated | Added userId + timestamp check in callback |
| 11 | DELETE/PATCH channel missing org_id on admin client | Added `.eq('organization_id', ...)` to both |
| 12 | IntegrationsTab not showing connected Google email | Shows `meta['email']` for OAuth providers |

---

## Patterns to Follow

- Server components fetch data, pass to `'use client'` components as props
- All DB queries in server components or API routes — never direct Supabase from client
- `createAdminClient()` for privileged writes that need to bypass RLS
- Error states: return `{ error: message }` from API, show inline in UI
- Empty states: always show icon + title + description, never a blank area
- Loading states: `Loader2` from lucide-react with `animate-spin`
- Toasts: `toast.success()` / `toast.error()` from `react-hot-toast`
- No comments unless the WHY is non-obvious
- No backwards-compat hacks — just change the code
- No fake/demo UI — all data must persist to DB

---

## Current State (as of last session)

- All DB tables exist and match frontend expectations
- TypeScript compiles with zero errors
- All 53 API routes audited — org isolation confirmed
- Chat system fully functional with pin/leave/delete controls
- File upload/download/delete working via Supabase Storage
- Google Calendar OAuth working with CSRF protection
- Email (Resend) working for outreach send-test and team invites
- Notifications stacking, mark-all-read, and bell persistence all working
- No console errors, no API 500s on happy path

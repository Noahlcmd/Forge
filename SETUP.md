# Forge — Setup Instructions

## Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

## Phase 1 Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Find these in: Supabase Dashboard → Project Settings → API

### 3. Run the database schema
1. Open Supabase Dashboard → SQL Editor
2. Paste and run the contents of `supabase/schema.sql`

This creates:
- `organizations` table
- `profiles` table
- Row Level Security policies
- Trigger that auto-creates a profile + organization on signup

### 4. Configure Supabase Auth
In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

### 5. Start the dev server
```bash
npm run dev
```

Open: http://localhost:3000

---

## What's in Phase 1

| Feature | Status |
|---|---|
| Email/password signup | ✅ |
| Email/password login | ✅ |
| Password reset via email | ✅ |
| Set new password | ✅ |
| Protected dashboard (auth required) | ✅ |
| Auto-create org + owner profile on signup | ✅ |
| Role display (Owner / Admin / Employee) | ✅ |
| Session persistence | ✅ |
| Sign out | ✅ |
| All nav routes exist (no 404s) | ✅ |

## Auth Flow
1. `/` → redirects to `/dashboard`
2. Unauthenticated → redirects to `/login`
3. Signed in → can access all dashboard routes
4. Signup → email confirmation → `/dashboard`
5. Reset password → email link → `/update-password`

---

## Coming in Phase 2
- Stripe subscription setup and payment gating
- Webhook handling for subscription events

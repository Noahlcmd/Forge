/**
 * WORKSPACE MODULE TEMPLATE
 * ─────────────────────────────────────────────────────────────────────────────
 * Copy this file to workspace/<your-module>/page.tsx and replace all
 * occurrences of "Thing" / "things" / "thing" with your entity name.
 *
 * Checklist for a new module:
 *  1. Create this page file (server component — fetches data, passes to Client)
 *  2. Create <Module>Client.tsx  (client component — handles interactivity)
 *  3. Create src/app/api/<module>/route.ts  (GET + POST, use withSafeHandler)
 *  4. Create src/app/api/<module>/[id]/route.ts  (PATCH + DELETE)
 *  5. Add a DB migration for the new table
 *  6. Register the module slug in src/lib/modules.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient }  from '@/lib/supabase/server'
import { getAppUser }    from '@/lib/auth/getAppUser'
import { safeQuery }     from '@/lib/safe-server'
import { redirect }      from 'next/navigation'
import { ThingClient }   from './ThingClient'

// ── Entity type ────────────────────────────────────────────────────────────

export type Thing = {
  id:         string
  name:       string
  notes:      string | null
  created_at: string
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function ThingPage() {
  // 1. Auth — always wrap in try/catch
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  // 2. Module gate — redirect if this module is not enabled for the org
  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('things')) redirect('/workspace')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  // 3. DB query — use safeQuery so it never throws
  const { data, error } = await safeQuery(() =>
    supabase
      .from('things')
      .select('id, name, notes, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
  )

  if (error) console.error('[things page] query error:', error)

  // Pass null on error so the client knows to fall back to its own fetch
  const initialThings: Thing[] | null = error ? null : (data as Thing[])

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Things
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Manage your things
        </p>
      </div>
      <ThingClient initialThings={initialThings} />
    </div>
  )
}

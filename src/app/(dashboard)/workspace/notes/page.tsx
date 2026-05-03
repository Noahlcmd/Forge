import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { NotesClient } from './NotesClient'

export type Note = {
  id:         string
  title:      string
  content:    string | null
  created_at: string
  updated_at: string
}

export default async function NotesPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('notes')) redirect('/workspace')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })

  const notes: Note[] | null = error ? null : (data ?? []) as Note[]

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Notes
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Quick notes and documents for your team
        </p>
      </div>
      <NotesClient initialNotes={notes} />
    </div>
  )
}

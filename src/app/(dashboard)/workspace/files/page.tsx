import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { FilesClient } from './FilesClient'

export type FileEntry = {
  id:         string
  name:       string
  file_url:   string | null
  file_type:  string | null
  file_size:  number | null
  notes:      string | null
  created_at: string
}

export default async function FilesPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('files')) redirect('/workspace')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const { data, error } = await supabase
    .from('files')
    .select('id, name, file_url, file_type, file_size, notes, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const files: FileEntry[] | null = error ? null : (data ?? []) as FileEntry[]

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Files
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Track documents, links, and shared files for your team
        </p>
      </div>
      <FilesClient initialFiles={files} />
    </div>
  )
}

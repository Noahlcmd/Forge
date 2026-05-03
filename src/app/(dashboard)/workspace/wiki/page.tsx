import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { WikiClient, type WikiPage } from './WikiClient'

export default async function WikiPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('wiki')) redirect('/workspace')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const { data, error } = await supabase
    .from('wiki_pages')
    .select('id, title, slug, content, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })

  const initialPages: WikiPage[] | null = error ? null : (data ?? []) as WikiPage[]

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Wiki
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Create and share knowledge with your team
        </p>
      </div>
      <WikiClient initialPages={initialPages} />
    </div>
  )
}

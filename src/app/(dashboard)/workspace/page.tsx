import { getAppUser } from '@/lib/auth/getAppUser'
import { WorkspaceClient } from './WorkspaceClient'

export default async function WorkspacePage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
  const enabledModules = result.ok ? result.membership.organizations.enabled_modules : []

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Workspace
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Custom modules — enable additional tools for your business
        </p>
      </div>

      <WorkspaceClient enabledModules={enabledModules} />
    </div>
  )
}

import { notFound } from 'next/navigation'
import { getAppUser } from '@/lib/auth/getAppUser'
import { MODULE_MAP } from '@/lib/modules'

interface Props { params: { module: string } }

export default async function WorkspaceModulePage({ params }: Props) {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }
  const mod    = MODULE_MAP[params.module]

  if (!mod || !mod.workspace) notFound()

  const membership     = result.ok ? result.membership : null
  const enabledModules = membership?.organizations.enabled_modules ?? []

  if (!enabledModules.includes(params.module)) {
    return (
      <div className="flex flex-col flex-1 overflow-auto p-6">
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${mod.bg} flex items-center justify-center`}>
            <mod.icon className={`w-7 h-7 ${mod.color}`} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{mod.name} is not enabled</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Enable it from the Workspace page to get started.</p>
          </div>
          <a href="/workspace" className="btn btn-primary">
            Go to Workspace
          </a>
        </div>
      </div>
    )
  }

  const Icon = mod.icon

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <main className="flex-1 p-6">
        <div className="max-w-3xl">
          <div className="forge-card p-8 flex flex-col items-center text-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${mod.bg} flex items-center justify-center`}>
              <Icon className={`w-7 h-7 ${mod.color}`} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{mod.name}</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{mod.description}</p>
            </div>
            <div className="w-full max-w-sm rounded-[10px] border border-dashed p-6 text-center" style={{ borderColor: 'var(--card-border)' }}>
              <p className="text-[13px] font-[500]" style={{ color: 'var(--text-primary)' }}>
                Module not yet available
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {mod.name} is enabled but full functionality has not been built yet. Check back in a future update.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

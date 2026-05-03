import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { AIAssistantClient } from './AIAssistantClient'

export default async function AIAssistantPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('ai-assistant')) redirect('/workspace')

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--text-primary)' }}>
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          AI Assistant
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Ask anything about your business — powered by your real data
        </p>
      </div>
      <AIAssistantClient />
    </div>
  )
}

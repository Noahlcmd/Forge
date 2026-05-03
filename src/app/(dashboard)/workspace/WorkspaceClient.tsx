'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODULES } from '@/lib/modules'

interface Props {
  enabledModules: string[]
}

export function WorkspaceClient({ enabledModules }: Props) {
  const router  = useRouter()
  const modules = MODULES.filter(m => m.workspace)

  const [enabled, setEnabled] = useState<Set<string>>(
    new Set(enabledModules.filter(id => modules.some(m => m.id === id)))
  )
  const [saving, setSaving] = useState<string | null>(null)

  async function toggle(moduleId: string) {
    const next = new Set(enabled)
    if (next.has(moduleId)) { next.delete(moduleId) } else { next.add(moduleId) }
    setSaving(moduleId)
    try {
      // Preserve existing nav modules; replace workspace module list
      const navEnabled  = enabledModules.filter(id => !modules.some(m => m.id === id))
      const allEnabled  = [...navEnabled, ...Array.from(next)]
      const res = await fetch('/api/settings/modules', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled_modules: allEnabled }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setEnabled(next)
      router.refresh()
    } catch {
      // API failed — keep previous state (no-op since setEnabled not called)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map(mod => {
        const isEnabled = enabled.has(mod.id)
        const isSaving  = saving === mod.id
        const Icon      = mod.icon

        return (
          <div
            key={mod.id}
            className={cn(
              'rounded-xl border p-5 transition-all',
              isEnabled ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 bg-zinc-900/50'
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg ${mod.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${mod.color}`} />
              </div>
              <button
                onClick={() => toggle(mod.id)}
                disabled={isSaving}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0',
                  isEnabled
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                    : 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600'
                )}
              >
                {isSaving
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : isEnabled
                    ? <Check className="w-3 h-3" />
                    : null
                }
                {isSaving ? 'Saving…' : isEnabled ? 'Enabled' : 'Enable'}
              </button>
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">{mod.name}</h3>
            <p className="text-xs text-zinc-500 mt-1">{mod.description}</p>
            {isEnabled && (
              <a
                href={mod.href}
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                Open module <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

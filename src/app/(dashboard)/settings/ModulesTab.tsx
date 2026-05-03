'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODULES } from '@/lib/modules'

interface Props { enabledModules: string[] }

export function ModulesTab({ enabledModules }: Props) {
  const router  = useRouter()
  const [enabled, setEnabled] = useState<Set<string>>(new Set(enabledModules))
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // All modules that can be toggled (core modules always on)
  const toggleable = MODULES.filter(m => !m.core)

  function toggle(id: string) {
    setEnabled(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      // Always keep core modules enabled
      const coreIds  = MODULES.filter(m => m.core).map(m => m.id)
      const allEnabled = Array.from(new Set([...coreIds, ...Array.from(enabled)]))
      const res = await fetch('/api/settings/modules', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ enabled_modules: allEnabled }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Failed to save')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const navMods  = toggleable.filter(m => !m.workspace)
  const wkspMods = toggleable.filter(m => m.workspace)

  return (
    <div className="space-y-6">
      <ModuleGroup
        title="Navigation modules"
        desc="Control which items appear in the sidebar."
        modules={navMods}
        enabled={enabled}
        onToggle={toggle}
      />
      <ModuleGroup
        title="Workspace modules"
        desc="Additional tools available in your Workspace."
        modules={wkspMods}
        enabled={enabled}
        onToggle={toggle}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 h-9 px-5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {saved  && <Check className="w-3.5 h-3.5" />}
        {saved ? 'Saved' : saving ? 'Saving…' : 'Save modules'}
      </button>
    </div>
  )
}

function ModuleGroup({ title, desc, modules, enabled, onToggle }: {
  title: string; desc: string
  modules: ReturnType<typeof MODULES.filter>
  enabled: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      <p className="text-xs text-zinc-500 mt-0.5 mb-4">{desc}</p>
      <div className="space-y-2">
        {modules.map(mod => {
          const isOn = enabled.has(mod.id)
          const Icon = mod.icon
          return (
            <div key={mod.id}
              className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-800 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${mod.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${mod.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">{mod.name}</p>
                  <p className="text-xs text-zinc-600">{mod.description}</p>
                </div>
              </div>
              <button onClick={() => onToggle(mod.id)}
                className={cn(
                  'relative w-10 h-5 rounded-full border transition-all shrink-0',
                  isOn ? 'bg-orange-500 border-orange-500' : 'bg-zinc-700 border-zinc-600'
                )}>
                <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', isOn ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import type { LucideIcon } from 'lucide-react'

interface SectionShellProps {
  title:       string
  icon:        LucideIcon
  description: string
  ctaLabel:    string
  phase:       string
}

export function SectionShell({ title, icon: Icon, description, ctaLabel, phase }: SectionShellProps) {
  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: '#eef0ff' }}
          >
            <Icon className="w-8 h-8" style={{ color: '#4f5fd4' }} />
          </div>
          <div>
            <h2 className="text-[18px] font-[600] mb-2" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Full functionality is coming in {phase}. Authentication and roles are ready.
            </p>
          </div>
          <button
            disabled
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-[500] border cursor-not-allowed opacity-50 transition-all"
            style={{
              background: '#fff',
              color: 'var(--text-secondary)',
              borderColor: 'var(--card-border)',
            }}
          >
            {ctaLabel}
          </button>
        </div>
      </main>
    </div>
  )
}

import { cn } from '@/lib/utils'

interface ToolCardProps {
  name: string
  initial: string
  color: string
  connected: boolean
}

export function ToolCard({ name, initial, color, connected }: ToolCardProps) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0',
        color
      )}>
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-zinc-200 truncate">{name}</span>
          <span className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            connected ? 'bg-green-400' : 'bg-zinc-600'
          )} />
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {connected ? 'Connected' : 'Not connected'}
        </p>
      </div>

      {!connected && (
        <button className="text-xs font-medium text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-orange-400/10 transition-colors shrink-0">
          Connect
        </button>
      )}
    </div>
  )
}

import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const style =
    score >= 80 ? 'bg-green-400/10   text-green-400   border-green-400/20'  :
    score >= 60 ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20':
    score >= 40 ? 'bg-yellow-400/10  text-yellow-400  border-yellow-400/20' :
                  'bg-red-400/10     text-red-400     border-red-400/20'

  return (
    <span className={cn(
      'inline-flex items-center justify-center w-9 h-6 rounded-md border text-xs font-bold tabular-nums',
      style
    )}>
      {score}
    </span>
  )
}

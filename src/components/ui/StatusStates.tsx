'use client'

import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

// ── LoadingState ──────────────────────────────────────────────────────────────

interface LoadingStateProps {
  /** Number of skeleton rows to show. Default 3. */
  rows?: number
  /** Optional explicit message instead of skeleton rows. */
  message?: string
}

export function LoadingState({ rows = 3, message }: LoadingStateProps) {
  if (message) {
    return (
      <div className="forge-card flex items-center justify-center gap-3 py-16">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{message}</p>
      </div>
    )
  }

  return (
    <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-[13px] animate-pulse"
          style={{ borderBottom: i < rows - 1 ? '1px solid var(--card-border)' : undefined }}
        >
          <div className="w-7 h-7 rounded-full shrink-0" style={{ background: 'var(--surface-subtle)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded w-1/3" style={{ background: 'var(--surface-subtle)' }} />
            <div className="h-2.5 rounded w-1/2" style={{ background: 'var(--surface-subtle)' }} />
          </div>
          <div className="h-5 w-14 rounded-full" style={{ background: 'var(--surface-subtle)' }} />
        </div>
      ))}
    </div>
  )
}

// ── ErrorState ────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  /** User-visible message. Keep it safe — no internal details. */
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="forge-card flex items-start gap-3 p-4"
      style={{ borderColor: '#fecaca' }}
    >
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-red-600">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 flex items-center gap-1.5 text-[12px] font-[500] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  /** Optional CTA button / link rendered below the description. */
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="forge-card flex flex-col items-center justify-center py-20 text-center gap-4">
      {icon && (
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--surface-subtle)' }}
        >
          {icon}
        </div>
      )}
      <div>
        <p className="text-[14px] font-[500]" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        {description && (
          <p className="text-[13px] mt-1 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

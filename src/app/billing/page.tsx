import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Flame, CheckCircle, AlertCircle, Clock, PartyPopper } from 'lucide-react'
import BillingActions from './BillingActions'
import { ActivationPoller } from './ActivationPoller'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, {
  label:       string
  color:       string
  icon:        typeof CheckCircle
  description: string
}> = {
  active:   { label: 'Active',   color: 'text-green-400',  icon: CheckCircle, description: 'Your subscription is active.'                          },
  trialing: { label: 'Trial',    color: 'text-blue-400',   icon: Clock,       description: 'You are on a free trial.'                              },
  past_due: { label: 'Past Due', color: 'text-yellow-400', icon: AlertCircle, description: 'A payment failed. Please update your billing details.' },
  canceled: { label: 'Canceled', color: 'text-zinc-400',   icon: AlertCircle, description: 'Your subscription has been canceled.'                  },
  inactive: { label: 'Inactive', color: 'text-zinc-400',   icon: AlertCircle, description: 'No active subscription.'                              },
}

const ACTIVE = new Set(['active', 'trialing'])

interface Props {
  searchParams: { success?: string }
}

export default async function BillingPage({ searchParams }: Props) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: membership } = await supabase
    .from('memberships')
    .select('organizations(id, name, subscription_status, subscription_plan, stripe_customer_id, current_period_end, trial_ends_at)')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  const org = membership?.organizations as unknown as {
    id: string
    name: string
    subscription_status: string | null
    subscription_plan: string | null
    stripe_customer_id: string | null
    current_period_end: string | null
    trial_ends_at: string | null
  } | null

  if (!org) redirect('/login')

  const status     = org.subscription_status ?? 'inactive'
  const config     = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive
  const StatusIcon = config.icon
  const isActive   = ACTIVE.has(status)
  const showSuccess = searchParams.success === '1'
  // User just paid but webhook hasn't arrived yet
  const pendingActivation = showSuccess && !isActive

  const periodEnd = org.current_period_end ?? org.trial_ends_at
  const periodEndDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className="w-full max-w-md flex flex-col gap-4">

      {/* Success / pending banner */}
      {showSuccess && (
        <div className={cn(
          'rounded-xl border px-4 py-3 flex items-start gap-3',
          isActive
            ? 'border-green-500/20 bg-green-500/10'
            : 'border-orange-500/20 bg-orange-500/10'
        )}>
          <PartyPopper className={cn('w-4 h-4 shrink-0 mt-0.5', isActive ? 'text-green-400' : 'text-orange-400')} />
          <div>
            <p className={cn('text-sm font-medium', isActive ? 'text-green-400' : 'text-orange-400')}>
              {isActive ? 'Payment confirmed — you\'re all set!' : 'Payment received!'}
            </p>
            <p className={cn('text-xs mt-0.5', isActive ? 'text-green-400/70' : 'text-orange-400/70')}>
              {isActive
                ? 'Your subscription is active. Redirecting to dashboard…'
                : 'Activating your account. You\'ll be redirected automatically.'}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow shadow-orange-500/30">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">Forge Billing</h1>
            <p className="text-xs text-zinc-500">{org.name}</p>
          </div>
        </div>

        {/* Status */}
        <div className="px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className={cn('w-4 h-4', config.color)} />
            <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
          </div>
          <p className="text-xs text-zinc-500">{config.description}</p>
          {periodEndDate && (
            <p className="text-xs text-zinc-600 mt-1">
              {status === 'trialing' ? 'Trial ends' : 'Renews'} {periodEndDate}
            </p>
          )}
        </div>

        {/* Plan */}
        <div className="px-6 py-5 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 mb-0.5">Plan</p>
          <p className="text-sm font-medium text-zinc-200">
            {org.subscription_plan ?? 'Forge Pro'}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 flex flex-col gap-3">
          {/* Auto-redirect after active payment */}
          {showSuccess && isActive && (
            <div className="text-center">
              <Link href="/dashboard" className="text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors">
                Go to dashboard →
              </Link>
            </div>
          )}

          {/* Auto-poll when waiting for activation */}
          {pendingActivation && <ActivationPoller />}

          {/* Normal billing actions when not in success flow */}
          {!showSuccess && (
            <>
              <BillingActions isActive={isActive} hasCustomer={!!org.stripe_customer_id} />
              {isActive && (
                <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 text-center transition-colors">
                  Go to dashboard →
                </Link>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}

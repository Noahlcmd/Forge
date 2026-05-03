import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSafeHandler } from '@/lib/safe-server'

const ACTIVE = new Set(['active', 'trialing'])

export const GET = withSafeHandler(async () => {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ status: 'unauthenticated', isActive: false, hasCustomer: false }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('organizations(subscription_status, stripe_customer_id)')
    .eq('user_id', user.id)
    .maybeSingle()

  const org = membership?.organizations as unknown as {
    subscription_status: string | null
    stripe_customer_id: string | null
  } | null

  const status      = org?.subscription_status ?? 'inactive'
  const isActive    = ACTIVE.has(status)
  const hasCustomer = !!org?.stripe_customer_id

  console.log('[billing/status]', { status, isActive, hasCustomer })
  return NextResponse.json({ status, isActive, hasCustomer })
})

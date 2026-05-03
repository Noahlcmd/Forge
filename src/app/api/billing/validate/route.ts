/**
 * GET /api/billing/validate
 *
 * Diagnostic endpoint — call this to verify your billing configuration
 * before attempting a real checkout. Returns a JSON health report.
 *
 * Auth required: yes (uses user session).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler } from '@/lib/safe-server'

interface Check {
  ok:      boolean
  value?:  string
  error?:  string
  hint?:   string
}

export const GET = withSafeHandler(async () => {
  const report: Record<string, Check> = {}
  let allOk = true

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Env vars ────────────────────────────────────────────────────────────
  const secretKey     = process.env.STRIPE_SECRET_KEY
  const priceId       = process.env.STRIPE_PRICE_ID
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const serviceKey    = process.env.SUPABASE_SERVICE_ROLE_KEY

  const stripeMode = secretKey?.startsWith('sk_live_') ? 'live' : 'test'

  report.STRIPE_SECRET_KEY = secretKey
    ? { ok: true, value: `${stripeMode} key (sk_...${secretKey.slice(-4)})` }
    : { ok: false, error: 'Missing', hint: 'Add STRIPE_SECRET_KEY to .env.local' }

  report.STRIPE_PRICE_ID = priceId
    ? { ok: true, value: priceId }
    : { ok: false, error: 'Missing', hint: 'Add STRIPE_PRICE_ID to .env.local' }

  const webhookPlaceholder = !webhookSecret || webhookSecret === 'whsec_...'
  report.STRIPE_WEBHOOK_SECRET = !webhookSecret
    ? { ok: false, error: 'Missing', hint: 'Run: stripe listen --forward-to localhost:PORT/api/billing/webhook' }
    : webhookPlaceholder
      ? { ok: false, error: 'Placeholder value — not configured', hint: 'Run stripe listen, copy the whsec_... secret, restart the server' }
      : { ok: true, value: `whsec_...${webhookSecret.slice(-4)}` }

  report.SUPABASE_SERVICE_ROLE_KEY = serviceKey
    ? { ok: true, value: `set (${serviceKey.length} chars)` }
    : { ok: false, error: 'Missing', hint: 'Add SUPABASE_SERVICE_ROLE_KEY from Supabase → Project Settings → API' }

  // ── 3. Stripe connectivity ─────────────────────────────────────────────────
  if (priceId && secretKey) {
    try {
      const price = await stripe.prices.retrieve(priceId)
      report.stripe_price = {
        ok:    price.active,
        value: `${price.id} | active=${price.active} | type=${price.type}`,
        ...(!price.active ? { error: 'Price is not active', hint: 'Activate the price in the Stripe dashboard' } : {}),
        ...(price.type !== 'recurring' ? { error: 'Not a recurring price', hint: 'Use a subscription price, not a one-time price' } : {}),
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      report.stripe_price = {
        ok:    false,
        error: message,
        hint:  `Is STRIPE_PRICE_ID (${priceId}) from the same Stripe account as your secret key? Check test vs live mode.`,
      }
    }
  } else {
    report.stripe_price = { ok: false, error: 'Skipped (STRIPE_SECRET_KEY or STRIPE_PRICE_ID missing)' }
  }

  // ── 4. Supabase admin connectivity ─────────────────────────────────────────
  if (serviceKey) {
    try {
      const admin = createAdminClient()
      const { error } = await admin.from('organizations').select('id').limit(1)
      report.supabase_admin = error
        ? { ok: false, error: error.message }
        : { ok: true, value: 'connected' }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      report.supabase_admin = { ok: false, error: message }
    }
  } else {
    report.supabase_admin = { ok: false, error: 'Skipped (SUPABASE_SERVICE_ROLE_KEY missing)' }
  }

  // ── 5. Check user's org ─────────────────────────────────────────────────────
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, organizations(id, subscription_status, stripe_customer_id)')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  const org = membership?.organizations as unknown as {
    id: string
    subscription_status: string | null
    stripe_customer_id: string | null
  } | null

  report.user_org = org
    ? {
        ok:    true,
        value: `org=${org.id} | status=${org.subscription_status ?? 'null'} | customer=${org.stripe_customer_id ?? 'none'}`,
      }
    : { ok: false, error: 'No organization found for this user' }

  // ── Summary ────────────────────────────────────────────────────────────────
  allOk = Object.values(report).every(c => c.ok)

  console.log('[validate] Billing health check — ok:', allOk)
  Object.entries(report).forEach(([k, v]) => {
    if (!v.ok) console.warn('[validate] FAIL:', k, '—', v.error)
  })

  return NextResponse.json({ ok: allOk, mode: stripeMode, checks: report })
})

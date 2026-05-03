import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler } from '@/lib/safe-server'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

// ─── DB helper ───────────────────────────────────────────────────────────────

async function activateOrg(orgId: string, customerId: string, extra: Record<string, unknown> = {}) {
  const admin = createAdminClient()

  const payload = {
    subscription_status: 'active',
    is_active:           true,
    stripe_customer_id:  customerId,
    ...extra,
  }

  console.log(`[webhook] DB UPDATE — org: ${orgId}`, JSON.stringify(payload))

  const { data, error } = await admin
    .from('organizations')
    .update(payload)
    .eq('id', orgId)
    .select('id, subscription_status, stripe_customer_id')

  console.log('[webhook] DB UPDATE RESULT:', JSON.stringify({ data, error }))

  if (error) {
    throw new Error(`DB update failed for org ${orgId}: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error(`DB update matched 0 rows — org ${orgId} does not exist or ID is wrong`)
  }

  console.log(`[webhook] ✓ Org ${orgId} activated. Row:`, JSON.stringify(data[0]))
}

// ─── POST ────────────────────────────────────────────────────────────────────

export const POST = withSafeHandler(async (req: Request) => {
  // ── 1. Validate webhook secret ──────────────────────────────────────────
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || webhookSecret === 'whsec_...') {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is missing or still the placeholder.')
    console.error('[webhook] Fix: stripe listen --forward-to localhost:<PORT>/api/billing/webhook')
    console.error('[webhook] Then copy whsec_... into .env.local and restart the server.')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // ── 2. Read raw body and verify signature ───────────────────────────────
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    console.error('[webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[webhook] Signature verification failed:', msg)
    return NextResponse.json({ error: `Invalid signature: ${msg}` }, { status: 400 })
  }

  // ── 3. Log the full event ────────────────────────────────────────────────
  console.log('EVENT TYPE:', event.type)
  console.log('FULL EVENT:', JSON.stringify(event, null, 2))

  // ── 4. Route to handler ──────────────────────────────────────────────────
  try {
    await handleEvent(event)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[webhook] HANDLER FAILED for ${event.type}:`, msg)
    // Return 500 so Stripe retries — all DB updates are idempotent
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
})

// ─── event handlers ──────────────────────────────────────────────────────────

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {

    // Primary activation event — fires when user completes checkout
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.mode !== 'subscription') {
        console.log('[webhook] checkout.session.completed: skipping (mode =', session.mode, ')')
        return
      }

      // organization_id is on session.metadata (set during checkout session creation)
      const orgId = session.metadata?.organization_id
      if (!orgId) {
        throw new Error(
          `checkout.session.completed: session.metadata.organization_id is missing. ` +
          `Session ID: ${session.id}. ` +
          `This means the checkout session was created without metadata.organization_id.`
        )
      }

      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id

      if (!customerId) {
        throw new Error(`checkout.session.completed: session.customer is missing. Session: ${session.id}`)
      }

      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

      console.log(`[webhook] checkout.session.completed — org: ${orgId} | customer: ${customerId} | sub: ${subscriptionId}`)

      await activateOrg(orgId, customerId, {
        stripe_subscription_id: subscriptionId ?? null,
      })
      return
    }

    // Fires on every successful invoice payment (initial + renewals)
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice

      // organization_id is snapshotted on invoice.parent.subscription_details.metadata
      const orgId = invoice.parent?.subscription_details?.metadata?.organization_id
      if (!orgId) {
        throw new Error(
          `invoice.paid: could not find organization_id. ` +
          `invoice.parent.subscription_details.metadata = ` +
          JSON.stringify(invoice.parent?.subscription_details?.metadata) + `. ` +
          `Invoice: ${invoice.id}`
        )
      }

      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : (invoice.customer as Stripe.Customer | null)?.id

      if (!customerId) {
        throw new Error(`invoice.paid: invoice.customer is missing. Invoice: ${invoice.id}`)
      }

      const subscriptionId = typeof invoice.parent?.subscription_details?.subscription === 'string'
        ? invoice.parent.subscription_details.subscription
        : (invoice.parent?.subscription_details?.subscription as Stripe.Subscription | undefined)?.id

      console.log(`[webhook] invoice.paid — org: ${orgId} | customer: ${customerId} | sub: ${subscriptionId}`)

      await activateOrg(orgId, customerId, {
        ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
      })
      return
    }

    // Subscription created (fires just before checkout.session.completed)
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription
      const orgId = subscription.metadata?.organization_id
      if (!orgId) {
        // Not a hard fail — this can fire for non-Forge subscriptions on the account
        console.warn('[webhook] customer.subscription.created: no organization_id in metadata — skipping')
        return
      }
      const cid = typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as Stripe.Customer | null)?.id
      if (!cid) { console.warn('[webhook] subscription.created: no customer ID'); return }
      console.log(`[webhook] customer.subscription.created — org: ${orgId} | status: ${subscription.status}`)
      await activateOrg(orgId, cid, { stripe_subscription_id: subscription.id })
      return
    }

    // Status changes after creation (pauses, trial endings, etc.)
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const orgId = subscription.metadata?.organization_id
      if (!orgId) { console.warn('[webhook] subscription.updated: no organization_id — skipping'); return }
      const cid = typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as Stripe.Customer | null)?.id
      if (!cid) { console.warn('[webhook] subscription.updated: no customer ID'); return }
      console.log(`[webhook] customer.subscription.updated — org: ${orgId} | status: ${subscription.status}`)
      // Use the actual mapped status for updates, not always 'active'
      const admin = createAdminClient()
      const mapped = mapStatus(subscription.status)
      const { data, error } = await admin
        .from('organizations')
        .update({
          subscription_status: mapped,
          is_active: mapped === 'active' || mapped === 'trialing',
          stripe_customer_id: cid,
        })
        .eq('id', orgId)
        .select('id, subscription_status')
      console.log('[webhook] subscription.updated DB RESULT:', JSON.stringify({ data, error }))
      if (error) throw new Error(`DB update failed: ${error.message}`)
      return
    }

    // Hard cancellation
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const orgId = subscription.metadata?.organization_id
      if (!orgId) { console.warn('[webhook] subscription.deleted: no organization_id — skipping'); return }
      console.log(`[webhook] customer.subscription.deleted — org: ${orgId}`)
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('organizations')
        .update({ subscription_status: 'canceled', is_active: false, stripe_subscription_id: null, current_period_end: null })
        .eq('id', orgId)
        .select('id, subscription_status')
      console.log('[webhook] subscription.deleted DB RESULT:', JSON.stringify({ data, error }))
      if (error) throw new Error(`DB update failed: ${error.message}`)
      return
    }

    default:
      console.log('[webhook] Unhandled event type:', event.type, '— no action taken')
  }
}

// Stripe status → our DB CHECK constraint values
function mapStatus(s: string): string {
  switch (s) {
    case 'active':             return 'active'
    case 'trialing':           return 'trialing'
    case 'past_due':           return 'past_due'
    case 'canceled':           return 'canceled'
    case 'incomplete':         return 'past_due'
    case 'incomplete_expired': return 'canceled'
    case 'unpaid':             return 'past_due'
    case 'paused':             return 'inactive'
    default:                   return 'inactive'
  }
}

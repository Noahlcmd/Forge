import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { withSafeHandler } from '@/lib/safe-server'

/** Derive the app origin from the incoming request so the URL always matches
 *  the actual running port, regardless of NEXT_PUBLIC_APP_URL. */
function requestOrigin(req: Request): string {
  const origin = req.headers.get('origin')
  if (origin) return origin

  // When called server-side or without an Origin header, fall back to host
  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  return `${proto}://${host}`
}

export const POST = withSafeHandler(async (req: Request) => {
  const priceId = process.env.STRIPE_PRICE_STANDARD ?? process.env.STRIPE_PRICE_TEST ?? process.env.STRIPE_PRICE_ID
  const origin  = requestOrigin(req)

  console.log('[checkout] origin:', origin, '| STRIPE_PRICE_ID:', priceId ?? '(not set)')

  if (!priceId) {
    console.error('[checkout] STRIPE_PRICE_ID is missing from env')
    return NextResponse.json({ error: 'Billing not configured: STRIPE_PRICE_ID is missing' }, { status: 500 })
  }

  try {
    // Validate the price exists and is active in Stripe before anything else.
    // Catches mismatched test/live keys and deleted prices immediately.
    let price: { active: boolean; type: string }
    try {
      price = await stripe.prices.retrieve(priceId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[checkout] Price validation failed:', message)
      return NextResponse.json(
        { error: `Invalid STRIPE_PRICE_ID (${priceId}): ${message}` },
        { status: 500 }
      )
    }

    if (!price.active) {
      console.error('[checkout] Price', priceId, 'exists but is not active')
      return NextResponse.json({ error: `Price ${priceId} is not active in Stripe` }, { status: 500 })
    }

    if (price.type !== 'recurring') {
      console.error('[checkout] Price', priceId, 'is not a recurring price (type:', price.type, ')')
      return NextResponse.json(
        { error: `Price ${priceId} is a one-time price, not a subscription price` },
        { status: 500 }
      )
    }

    const supabase = createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('organization_id, organizations(id, name, stripe_customer_id)')
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .maybeSingle()

    if (membershipError) {
      console.error('[checkout] Membership query error:', membershipError.message)
      return NextResponse.json({ error: 'Failed to load organization' }, { status: 500 })
    }

    if (!membership?.organization_id) {
      return NextResponse.json({ error: 'No active organization found' }, { status: 400 })
    }

    const org = membership.organizations as unknown as {
      id: string
      name: string
      stripe_customer_id: string | null
    }

    let customerId = org.stripe_customer_id

    if (!customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single()

      console.log('[checkout] Creating Stripe customer for org:', org.id)
      const customer = await stripe.customers.create({
        email:    profile?.email ?? user.email ?? undefined,
        name:     org.name,
        metadata: { organization_id: org.id },
      })
      customerId = customer.id
      console.log('[checkout] Created Stripe customer:', customerId)

      // Must use admin client — regular client is blocked by RLS on organizations
      const admin = createAdminClient()
      const { error: updateError } = await admin
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id)

      if (updateError) {
        console.error('[checkout] Could not persist customer ID to DB:', updateError.message)
        // Non-fatal: webhook will also write it via checkout.session.completed
      }
    } else {
      console.log('[checkout] Reusing existing Stripe customer:', customerId)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode:     'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?success=1`,
      cancel_url:  `${origin}/billing`,
      allow_promotion_codes: true,
      // organization_id on the session itself → available immediately from
      // checkout.session.completed without a separate subscriptions.retrieve() call
      metadata: { organization_id: org.id },
      subscription_data: {
        // also on the subscription so subscription.* events can find the org
        metadata: { organization_id: org.id },
      },
    })

    if (!session.url) {
      console.error('[checkout] Stripe returned session without URL:', session.id)
      return NextResponse.json({ error: 'Checkout session created but no URL returned' }, { status: 500 })
    }

    console.log('[checkout] Session created:', session.id, '| org:', org.id)
    return NextResponse.json({ url: session.url })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[checkout] Unhandled error:', message)
    return NextResponse.json({ error: `Checkout failed: ${message}` }, { status: 500 })
  }
})

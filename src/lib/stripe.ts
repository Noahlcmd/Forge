import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing env: STRIPE_SECRET_KEY')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia' as const,
  typescript: true,
})

/**
 * Maps Stripe subscription statuses to the values stored in our DB.
 * The organizations.subscription_status CHECK constraint allows only:
 * active | trialing | past_due | canceled | inactive
 */
export function mapStripeStatus(
  stripeStatus: string
): 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive' {
  switch (stripeStatus) {
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

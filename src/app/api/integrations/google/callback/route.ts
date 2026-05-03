import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler } from '@/lib/safe-server'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, BASE))
}

export const GET = withSafeHandler(async (req: Request) => {
  const url   = new URL(req.url)
  const code  = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const state = url.searchParams.get('state')

  if (error || !code) {
    return redirect(`/settings?tab=integrations&error=${encodeURIComponent(error ?? 'oauth_denied')}`)
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect('/login')

  // Validate CSRF state: must decode correctly and userId must match
  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as { userId?: string; ts?: number }
      const ageMs = Date.now() - (decoded.ts ?? 0)
      if (decoded.userId !== user.id || ageMs > 10 * 60 * 1000) {
        return redirect('/settings?tab=integrations&error=invalid_state')
      }
    } catch {
      return redirect('/settings?tab=integrations&error=invalid_state')
    }
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.organization_id) return redirect('/settings?tab=integrations&error=no_org')

  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri  = `${BASE}/api/integrations/google/callback`

  if (!clientId || !clientSecret) {
    return redirect('/settings?tab=integrations&error=google_not_configured')
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return redirect('/settings?tab=integrations&error=token_exchange_failed')
  }

  const tokens = await tokenRes.json() as {
    access_token:  string
    refresh_token?: string
    expires_in:    number
    token_type:    string
    scope:         string
  }

  // Fetch Google profile to store the email
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const profile = profileRes.ok
    ? await profileRes.json() as { email?: string }
    : { email: undefined }

  const admin = createAdminClient()
  await admin
    .from('integrations')
    .upsert({
      organization_id: membership.organization_id,
      provider:        'google_calendar',
      status:          'connected',
      credentials: {
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at:    Date.now() + tokens.expires_in * 1000,
        token_type:    tokens.token_type,
        scope:         tokens.scope,
      },
      metadata: {
        email:      profile.email ?? null,
        connected_at: new Date().toISOString(),
      },
      created_by: user.id,
    }, { onConflict: 'organization_id,provider' })

  return redirect('/settings?tab=integrations&connected=google_calendar')
})

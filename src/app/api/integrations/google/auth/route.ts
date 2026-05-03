import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withSafeHandler } from '@/lib/safe-server'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
].join(' ')

export const GET = withSafeHandler(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))

  const clientId    = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/integrations/google/callback`

  if (!clientId) {
    return NextResponse.redirect(
      new URL('/settings?tab=integrations&error=google_not_configured', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    )
  }

  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64url')

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',
    prompt:        'consent',
    state,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

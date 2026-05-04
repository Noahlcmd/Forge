import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type')

  // Prefer NEXT_PUBLIC_APP_URL so redirects always use the canonical domain,
  // not any internal Vercel proxy URL that may appear in request.url.
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? origin).replace(/\/$/, '')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const redirectTo = type === 'recovery' ? `${base}/update-password` : `${base}${next}`
      return NextResponse.redirect(redirectTo)
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth_callback_failed`)
}

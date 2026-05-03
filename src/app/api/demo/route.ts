import { NextResponse } from 'next/server'
import { DEMO_COOKIE } from '@/lib/demo'
import { withSafeHandler } from '@/lib/safe-server'

export const POST = withSafeHandler(async (req: Request) => {
  const { enabled } = await req.json().catch(() => ({ enabled: false })) as { enabled?: boolean }
  const res = NextResponse.json({ ok: true })
  if (enabled) {
    res.cookies.set(DEMO_COOKIE, '1', {
      path:     '/',
      maxAge:   60 * 60 * 24,
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
  } else {
    res.cookies.delete(DEMO_COOKIE)
  }
  return res
})

import { cookies } from 'next/headers'

export const DEMO_COOKIE = 'forge_demo'

/** Read demo mode from the request cookie — safe to call in any Server Component or API Route. */
export function getDemoMode(): boolean {
  try {
    return cookies().get(DEMO_COOKIE)?.value === '1'
  } catch {
    return false
  }
}

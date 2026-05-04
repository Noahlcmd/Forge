/**
 * Returns the canonical app URL for the current environment.
 *
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL env var (set on Vercel to the production domain)
 *   2. window.location.origin (client-side fallback for local dev)
 *   3. http://localhost:3000 (last resort — never reached in production)
 *
 * Trailing slash is stripped so callers can safely append paths like `/auth/callback`.
 */
export function getAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin
  return 'http://localhost:3000'
}

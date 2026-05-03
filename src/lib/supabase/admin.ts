import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !roleKey) {
    const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !roleKey && 'SUPABASE_SERVICE_ROLE_KEY']
      .filter(Boolean).join(', ')
    throw new Error(`Admin client: missing env vars: ${missing}`)
  }

  return createClient(url, roleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

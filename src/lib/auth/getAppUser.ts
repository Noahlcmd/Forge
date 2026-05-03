import { createClient } from '@/lib/supabase/server'
import { mergeTheme } from '@/lib/theme'
import { ALL_NAV_MODULES } from '@/lib/modules'
import type { Role, OrgTheme } from '@/types'

export type AppUserProfile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type AppUserOrg = {
  id: string
  name: string
  logo_url: string | null
  industry: string | null
  business_type: string | null
  onboarding_completed: boolean
  enabled_modules: string[]
  theme: OrgTheme
  subscription_status: string | null
  is_active: boolean
  is_test: boolean
  settings: Record<string, unknown>
}

export type AppUserMembership = {
  role: Role
  organizations: AppUserOrg
}

export type GetAppUserResult =
  | { ok: true; profile: AppUserProfile; membership: AppUserMembership }
  | { ok: false; reason: 'no_user' | 'no_profile' | 'no_membership' }

export async function getAppUser(): Promise<GetAppUserResult> {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { ok: false, reason: 'no_user' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (!profile) return { ok: false, reason: 'no_profile' }

  // Attempt full query (requires migration columns to exist).
  // No accepted_at filter — org owners may have null accepted_at since they
  // created the org rather than accepting an invite.
  const { data: fullMembership, error: fullError } = await supabase
    .from('memberships')
    .select(`
      role,
      organizations (
        id, name, logo_url, industry, business_type,
        onboarding_completed, enabled_modules, theme,
        subscription_status, is_active, is_test, settings
      )
    `)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!fullError && fullMembership?.organizations) {
    const rawOrg = fullMembership.organizations as unknown as Record<string, unknown>
    const org: AppUserOrg = {
      id:                   rawOrg.id as string,
      name:                 rawOrg.name as string,
      logo_url:             (rawOrg.logo_url  as string | null) ?? null,
      industry:             (rawOrg.industry  as string | null) ?? null,
      business_type:        (rawOrg.business_type as string | null) ?? null,
      onboarding_completed: Boolean(rawOrg.onboarding_completed),
      enabled_modules:      Array.isArray(rawOrg.enabled_modules)
                              ? (rawOrg.enabled_modules as string[])
                              : ALL_NAV_MODULES,
      theme:                mergeTheme(rawOrg.theme as Partial<OrgTheme> | null),
      subscription_status:  (rawOrg.subscription_status as string | null) ?? null,
      is_active:            Boolean(rawOrg.is_active),
      is_test:              Boolean(rawOrg.is_test),
      settings:             (rawOrg.settings as Record<string, unknown>) ?? {},
    }
    return {
      ok: true,
      profile: profile as AppUserProfile,
      membership: { role: fullMembership.role as Role, organizations: org },
    }
  }

  // Full query failed (most likely because migration columns don't exist yet).
  // Fall back to a minimal select that always works pre-migration.
  if (fullError) {
    console.warn('[getAppUser] Full query failed — falling back to minimal select. Error:', fullError.message)
  }

  const { data: minMembership, error: minError } = await supabase
    .from('memberships')
    .select('role, organizations (id, name, subscription_status)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (minError || !minMembership?.organizations) return { ok: false, reason: 'no_membership' }

  const rawMin = minMembership.organizations as unknown as {
    id: string; name: string; subscription_status: string | null
  }

  const org: AppUserOrg = {
    id:                   rawMin.id,
    name:                 rawMin.name,
    logo_url:             null,
    industry:             null,
    business_type:        null,
    onboarding_completed: false,
    enabled_modules:      ALL_NAV_MODULES,
    theme:                mergeTheme(null),
    subscription_status:  rawMin.subscription_status,
    is_active:            false,
    is_test:              false,
    settings:             {},
  }

  return {
    ok: true,
    profile: profile as AppUserProfile,
    membership: { role: minMembership.role as Role, organizations: org },
  }
}

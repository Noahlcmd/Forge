import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeEnabledModules } from '@/lib/modules'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const Schema = z.object({
  name:              z.string().trim().min(1).optional(),
  logo_url:          z.string().url().nullable().optional(),
  industry:          z.string().optional(),
  business_type:     z.string().optional(),
  client_acquisition: z.array(z.string()).optional(),
  runs_ads:          z.boolean().optional(),
  ad_budget:         z.string().optional(),
  manages_inventory: z.boolean().optional(),
  sends_invoices:    z.boolean().optional(),
  needs_crm:         z.boolean().optional(),
  needs_automation:  z.boolean().optional(),
  wants_ai:          z.boolean().optional(),
  manages_team:      z.boolean().optional(),
  team_size:         z.string().optional(),
})

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try { raw = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })
  }

  const data = parsed.data

  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.organization_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  const orgId = membership.organization_id

  // Check current onboarding state to prevent duplicate seed data on retries
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('onboarding_completed')
    .eq('id', orgId)
    .single()
  const alreadyOnboarded = orgRow?.onboarding_completed === true

  // Compute which modules to enable based on business type + ops answers
  const enabledModules = computeEnabledModules(data.business_type ?? null, {
    client_acquisition: data.client_acquisition,
    runs_ads:           data.runs_ads,
    manages_inventory:  data.manages_inventory,
    sends_invoices:     data.sends_invoices,
    needs_crm:          data.needs_crm,
    needs_automation:   data.needs_automation,
    wants_ai:           data.wants_ai,
    manages_team:       data.manages_team,
    ad_budget:          data.ad_budget,
    team_size:          data.team_size,
  })

  const admin = createAdminClient()

  // Build update payload (only update columns that exist after migration)
  const update: Record<string, unknown> = {
    onboarding_completed: true,
    enabled_modules:      enabledModules,
    settings: {
      onboarding_completed: true,
      business_type:        data.business_type,
      client_acquisition:   data.client_acquisition,
      runs_ads:             data.runs_ads,
      ad_budget:            data.ad_budget,
      manages_inventory:    data.manages_inventory,
      sends_invoices:       data.sends_invoices,
      needs_crm:            data.needs_crm,
      needs_automation:     data.needs_automation,
      wants_ai:             data.wants_ai,
      manages_team:         data.manages_team,
      team_size:            data.team_size,
      onboarding_at:        new Date().toISOString(),
    },
  }
  if (data.name)          update.name          = data.name
  if (data.logo_url)      update.logo_url      = data.logo_url
  if (data.industry)      update.industry      = data.industry
  if (data.business_type) update.business_type = data.business_type

  const { error } = await admin.from('organizations').update(update).eq('id', orgId)

  if (error) {
    console.error('[onboarding] DB update failed:', error.message)
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 })
  }

  // Seed sample data so new users see a populated platform immediately.
  // Skip if already onboarded to prevent duplicate rows on retry.
  if (alreadyOnboarded) {
    console.log(`[onboarding] ✓ Org ${orgId} already onboarded — skipping seed`)
    return NextResponse.json({ ok: true, enabled_modules: enabledModules })
  }

  await Promise.all([
    admin.from('customers').insert({
      organization_id: orgId,
      name:            'Sample Client',
      email:           'client@example.com',
      company:         'Acme Corp',
      status:          'active',
      created_by:      user.id,
    }),
    admin.from('leads').insert({
      organization_id: orgId,
      name:            'TechVentures Inc',
      company:         'TechVentures Inc',
      email:           'hello@techventures.io',
      stage:           'first_email_sent',
      source:          'LinkedIn',
      score:           72,
    }),
    admin.from('campaigns').insert({
      organization_id: orgId,
      name:            'Brand Awareness — Q2',
      platform:        'meta',
      status:          'draft',
      budget_cents:    100000,
      spent_cents:     0,
      created_by:      user.id,
    }),
  ]).catch(err => {
    console.warn('[onboarding] sample data seed failed (non-fatal):', err?.message)
  })

  console.log(`[onboarding] ✓ Org ${orgId} onboarded — modules:`, enabledModules.join(', '))
  return NextResponse.json({ ok: true, enabled_modules: enabledModules })
})

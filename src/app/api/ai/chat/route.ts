import { createClient } from '@/lib/supabase/server'
import { withSafeHandler, apiErr } from '@/lib/safe-server'
import { z } from 'zod'

const Schema = z.object({
  message: z.string().min(1).max(2000),
})

const CURRENT_MONTH_START = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiErr('Unauthorized', 401)

  // Get org_id from memberships — never trust request body for this
  const { data: membership } = await supabase
    .from('memberships')
    .select('organization_id, organizations(name, business_type)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) return apiErr('No active organization', 400)

  const orgId   = membership.organization_id
  const orgs    = membership.organizations as unknown as { name: string; business_type: string | null } | null
  const orgName = orgs?.name ?? 'your company'

  // Parse + validate body
  let raw: unknown
  try { raw = await req.json() } catch { return apiErr('Invalid JSON', 400) }
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) return apiErr(parsed.error.issues[0]?.message ?? 'Invalid request', 400)

  const { message } = parsed.data

  if (!process.env.ANTHROPIC_API_KEY) {
    return apiErr('ANTHROPIC_API_KEY is not configured.', 500)
  }

  // ── Fetch org data (all in parallel, scoped by orgId) ─────────────────────

  const [
    customersResult,
    leadsResult,
    campaignsResult,
    revenueResult,
    pipelineResult,
  ] = await Promise.all([
    supabase
      .from('customers')
      .select('id, name, email, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100),

    supabase
      .from('leads')
      .select('id, name, status, value, created_at')
      .eq('organization_id', orgId)
      .limit(200),

    supabase
      .from('campaigns')
      .select('id, name, status, budget, goal, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('transactions')
      .select('type, amount_cents, date, category')
      .eq('organization_id', orgId)
      .gte('date', CURRENT_MONTH_START),

    supabase
      .from('pipeline_deals')
      .select('id, title, value, stage, created_at')
      .eq('organization_id', orgId)
      .order('value', { ascending: false })
      .limit(20),
  ])

  // ── Build structured context ───────────────────────────────────────────────

  const customers = customersResult.data ?? []
  const leads     = leadsResult.data ?? []
  const campaigns = campaignsResult.data ?? []
  const txns      = revenueResult.data ?? []
  const deals     = pipelineResult.data ?? []

  const revenueThisMonth = txns
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount_cents ?? 0), 0) / 100

  const expensesThisMonth = txns
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount_cents ?? 0), 0) / 100

  const leadsByStatus = leads.reduce<Record<string, number>>((acc, l) => {
    const s = l.status ?? 'unknown'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const pipelineValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  const context = {
    organization: orgName,
    total_customers: customers.length,
    top_customers: customers.slice(0, 5).map(c => c.name),
    total_leads: leads.length,
    leads_by_status: leadsByStatus,
    pipeline_deal_count: deals.length,
    pipeline_total_value_usd: pipelineValue,
    top_deals: deals.slice(0, 3).map(d => ({ title: d.title, value: d.value, stage: d.stage })),
    revenue_this_month_usd: revenueThisMonth,
    expenses_this_month_usd: expensesThisMonth,
    profit_this_month_usd: revenueThisMonth - expensesThisMonth,
    active_campaigns: campaigns.filter(c => c.status === 'active').length,
    campaigns: campaigns.slice(0, 5).map(c => ({ name: c.name, status: c.status, goal: c.goal })),
  }

  // ── Call Anthropic ─────────────────────────────────────────────────────────

  const systemPrompt = `You are a sharp, practical business advisor for ${orgName}.
You have been given real business data for this organization.
Answer the user's question using ONLY this data — never invent numbers.
Give actionable, specific advice. Reference actual numbers when relevant.
Be concise: 2-4 short paragraphs max. Use plain text, no markdown headers.`

  const userContent = `Business data:
${JSON.stringify(context, null, 2)}

Question: ${message}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
    console.error('[ai/chat] Anthropic error:', err)
    return apiErr('AI service is temporarily unavailable. Please try again.', 502)
  }

  const result = await response.json() as { content: Array<{ type: string; text: string }> }
  const reply  = result.content?.find(c => c.type === 'text')?.text?.trim()

  if (!reply) {
    return apiErr('AI returned an empty response. Please try again.', 500)
  }

  return Response.json({ reply })
})

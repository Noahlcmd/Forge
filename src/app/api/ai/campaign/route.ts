import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const Schema = z.object({
  audience: z.string().min(1),
  location: z.string().min(1),
  budget:   z.string().min(1),
  goal:     z.enum(['lead_gen', 'sales', 'awareness', 'engagement']),
})

const GOAL_LABELS: Record<string, string> = {
  lead_gen:   'lead generation',
  sales:      'sales and conversions',
  awareness:  'brand awareness',
  engagement: 'engagement and community building',
}

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

  const { audience, location, budget, goal } = parsed.data

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured. Add it to your .env.local.' }, { status: 500 })
  }

  const prompt = `You are an expert digital marketing strategist. Generate a high-converting ad campaign.

Campaign details:
- Target audience: ${audience}
- Location: ${location}
- Monthly budget: $${budget}
- Goal: ${GOAL_LABELS[goal]}

Respond with ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "headline": "Compelling ad headline under 60 chars",
  "body": "Ad body copy 2-3 sentences that speaks to the audience pain point and solution",
  "cta": "Call to action button text (3-5 words)",
  "platforms": ["Platform1", "Platform2"],
  "estimatedLeads": 150,
  "costPerLead": 12.50,
  "reasoning": "1-2 sentences explaining why this approach works for this audience and goal"
}`

  try {
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
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(err?.error?.message ?? `Anthropic API error ${response.status}`)
    }

    const result = await response.json() as { content: Array<{ type: string; text: string }> }
    const text   = result.content?.find(c => c.type === 'text')?.text?.trim()

    if (!text) {
      throw new Error('Anthropic returned no text content')
    }

    const campaign = JSON.parse(text) as {
      headline: string; body: string; cta: string
      platforms: string[]; estimatedLeads: number; costPerLead: number; reasoning: string
    }

    return NextResponse.json(campaign)
  } catch (e) {
    if (e instanceof SyntaxError) {
      return NextResponse.json({ error: 'AI returned invalid response — please try again' }, { status: 500 })
    }
    console.error('[ai/campaign] Error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Campaign generation failed' }, { status: 500 })
  }
})

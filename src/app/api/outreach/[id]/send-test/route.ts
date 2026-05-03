import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { z } from 'zod'
import { withSafeHandler } from '@/lib/safe-server'

const BodySchema = z.object({
  to: z.string().email(),
})

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('memberships').select('organization_id').eq('user_id', userId).maybeSingle()
  return data?.organization_id ?? null
}

export const POST = withSafeHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid' }, { status: 400 })

  const { data: seq, error: seqErr } = await supabase
    .from('outreach')
    .select('id, name, from_name, from_email')
    .eq('id', params.id)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (seqErr || !seq) return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 })

  const resend = new Resend(apiKey)

  const fromAddress = seq.from_email
    ? `${seq.from_name ?? seq.from_email} <${seq.from_email}>`
    : 'Forge <onboarding@resend.dev>'

  const { error: sendError } = await resend.emails.send({
    from:    fromAddress,
    to:      parsed.data.to,
    subject: `[Test] ${seq.name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <p style="color:#6b7280;font-size:12px;margin-bottom:16px">
          This is a test email from your <strong>${seq.name}</strong> sequence in Forge.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
        <p>Hi there,</p>
        <p>
          This is a preview of your outreach sequence. When active, emails like this
          will be sent to your enrolled leads automatically.
        </p>
        <p style="margin-top:24px">
          Best,<br />
          <strong>${seq.from_name ?? 'Your Team'}</strong>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
        <p style="color:#9ca3af;font-size:11px">
          Sent via <a href="https://forge.app" style="color:#f97316">Forge</a> outreach
        </p>
      </div>
    `,
  })

  if (sendError) return NextResponse.json({ error: sendError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

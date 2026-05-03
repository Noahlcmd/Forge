import { Resend } from 'resend'

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Forge <noreply@forgeapp.io>'

export async function sendInviteEmail({
  to,
  inviterName,
  orgName,
  role,
  inviteLink,
}: {
  to:          string
  inviterName: string
  orgName:     string
  role:        string
  inviteLink:  string
}): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not configured' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const roleLabel = role === 'admin' ? 'Admin' : 'Member'

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f9fafb;padding:32px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827">You've been invited to ${orgName}</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px">
      ${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${roleLabel}</strong>.
    </p>
    <a href="${inviteLink}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
      Accept invitation
    </a>
    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">
      This link expires in 24 hours. If you did not expect this email, you can ignore it.
    </p>
  </div>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from:    FROM,
      to:      [to],
      subject: `${inviterName} invited you to join ${orgName} on Forge`,
      html,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Email send failed' }
  }
}

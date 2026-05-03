import { createAdminClient } from '@/lib/supabase/admin'

export async function createNotification(opts: {
  organizationId: string
  title:          string
  description?:   string
  link?:          string
}) {
  const admin = createAdminClient()
  await admin.from('notifications').insert({
    organization_id: opts.organizationId,
    title:           opts.title,
    description:     opts.description ?? null,
    link:            opts.link ?? null,
    read:            false,
  })
}

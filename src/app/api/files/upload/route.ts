import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler } from '@/lib/safe-server'

const BUCKET = 'org-files'
const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

async function getOrgId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.from('memberships').select('organization_id').eq('user_id', userId).maybeSingle()
  return data?.organization_id ?? null
}

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await admin.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES })
  }
}

export const POST = withSafeHandler(async (req: Request) => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = await getOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 })

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File exceeds 20 MB limit' }, { status: 400 })

  const notes = (formData.get('notes') as string | null) ?? undefined

  const ext      = file.name.split('.').pop() ?? ''
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_').slice(0, 100)
  const path     = `${orgId}/${crypto.randomUUID()}${ext ? `-${safeName}` : safeName}`

  const admin = createAdminClient()
  await ensureBucket(admin)

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  const { data, error } = await admin.from('files').insert({
    organization_id: orgId,
    name:            file.name,
    file_url:        publicUrl,
    file_type:       file.type || null,
    file_size:       file.size,
    notes:           notes || null,
    created_by:      user.id,
  }).select().single()

  if (error) {
    await admin.storage.from(BUCKET).remove([path])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
})

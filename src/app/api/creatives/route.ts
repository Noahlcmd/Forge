import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withSafeHandler } from '@/lib/safe-server'

async function getContext() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: m } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()
  return m?.organization_id ? { user, orgId: m.organization_id, supabase } : null
}

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  await admin.storage.createBucket('creatives', {
    public: true,
    allowedMimeTypes: ['image/*', 'video/*', 'application/pdf'],
    fileSizeLimit: 52428800,
  }).catch(() => {})
}

export const GET = withSafeHandler(async () => {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await ctx.supabase
    .from('creative_assets')
    .select('id, name, file_type, file_size, public_url, campaign_id, created_at')
    .eq('organization_id', ctx.orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
})

export const POST = withSafeHandler(async (req: Request) => {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const MAX_SIZE = 52428800 // 50 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds 50 MB limit' }, { status: 400 })
  }

  const admin = createAdminClient()
  await ensureBucket(admin)

  const ext      = file.name.split('.').pop() ?? 'bin'
  const filePath = `${ctx.orgId}/${crypto.randomUUID()}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await admin.storage
    .from('creatives')
    .upload(filePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from('creatives').getPublicUrl(filePath)

  const { data: asset, error: dbError } = await admin
    .from('creative_assets')
    .insert({
      organization_id: ctx.orgId,
      name:            file.name,
      file_path:       filePath,
      file_type:       file.type,
      file_size:       file.size,
      public_url:      publicUrl,
      uploaded_by:     ctx.user.id,
    })
    .select('id, name, file_type, file_size, public_url, campaign_id, created_at')
    .single()

  if (dbError) {
    await admin.storage.from('creatives').remove([filePath]).catch(() => {})
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(asset, { status: 201 })
})

export const DELETE = withSafeHandler(async (req: Request) => {
  const ctx = await getContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminClient()

  const { data: asset } = await admin
    .from('creative_assets')
    .select('file_path')
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .single()

  if (asset?.file_path) {
    await admin.storage.from('creatives').remove([asset.file_path]).catch(() => {})
  }

  const { error } = await admin
    .from('creative_assets')
    .delete()
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})

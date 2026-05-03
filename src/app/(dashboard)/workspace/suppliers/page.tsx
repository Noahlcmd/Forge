import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { SuppliersClient } from './SuppliersClient'

export type Supplier = {
  id:           string
  name:         string
  contact_name: string | null
  email:        string | null
  phone:        string | null
  notes:        string | null
  created_at:   string
}

export default async function SuppliersPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('suppliers')) redirect('/workspace')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, contact_name, email, phone, notes, created_at')
    .eq('organization_id', orgId)
    .order('name')

  const suppliers: Supplier[] | null = error ? null : (data ?? []) as Supplier[]

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Suppliers
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Manage your supplier relationships and contacts
        </p>
      </div>
      <SuppliersClient initialSuppliers={suppliers} />
    </div>
  )
}

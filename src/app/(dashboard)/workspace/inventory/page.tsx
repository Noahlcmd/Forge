import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { InventoryClient } from './InventoryClient'

type Item = {
  id:         string
  name:       string
  quantity:   number
  unit:       string | null
  notes:      string | null
  created_at: string
  updated_at: string
}

export default async function InventoryPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) {
    redirect('/dashboard')
  }

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('inventory')) {
    redirect('/workspace')
  }

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, quantity, unit, notes, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('name')

  const items: Item[] | null = error ? null : (data ?? []) as Item[]

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Inventory
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Track stock levels and quantities for your products and materials
        </p>
      </div>

      <InventoryClient initialItems={items} />
    </div>
  )
}

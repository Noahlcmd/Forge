import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { redirect } from 'next/navigation'
import { EquipmentClient } from './EquipmentClient'

export type EquipmentItem = {
  id:            string
  name:          string
  status:        'active' | 'maintenance' | 'retired'
  serial_number: string | null
  location:      string | null
  notes:         string | null
  created_at:    string
}

export default async function EquipmentPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  if (!result.ok) redirect('/dashboard')

  const enabledModules = result.membership.organizations.enabled_modules
  if (enabledModules.length > 0 && !enabledModules.includes('equipment')) redirect('/workspace')

  const supabase = createClient()
  const orgId    = result.membership.organizations.id

  const { data, error } = await supabase
    .from('equipment')
    .select('id, name, status, serial_number, location, notes, created_at')
    .eq('organization_id', orgId)
    .order('name')

  const items: EquipmentItem[] | null = error ? null : (data ?? []) as EquipmentItem[]

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>
      <div>
        <h1 className="text-[22px] font-[600] tracking-[-0.4px]" style={{ color: 'var(--text-primary)' }}>
          Equipment
        </h1>
        <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
          Track company equipment, status, and locations
        </p>
      </div>
      <EquipmentClient initialItems={items} />
    </div>
  )
}

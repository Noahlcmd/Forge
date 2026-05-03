import { createClient } from '@/lib/supabase/server'
import { getAppUser } from '@/lib/auth/getAppUser'
import { CalendarMonthClient } from './CalendarMonthClient'

type CalendarRow = {
  id:         string
  name:       string
  color:      string
  is_default: boolean
  created_at: string
}

type EventRow = {
  id:          string
  calendar_id: string
  title:       string
  start_at:    string
  end_at:      string
  all_day:     boolean
}

export default async function CalendarPage() {
  let result: Awaited<ReturnType<typeof getAppUser>>
  try { result = await getAppUser() } catch { result = { ok: false, reason: 'no_user' } as const }

  const supabase = createClient()
  const orgId    = result.ok ? result.membership.organizations.id : null

  let calendars: CalendarRow[] = []
  let events:    EventRow[]    = []

  if (orgId) {
    const now   = new Date()
    const from  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const to    = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

    const [calRes, evtRes] = await Promise.all([
      supabase
        .from('calendars')
        .select('id, name, color, is_default, created_at')
        .eq('organization_id', orgId)
        .order('created_at'),
      supabase
        .from('calendar_events')
        .select('id, calendar_id, title, start_at, end_at, all_day')
        .eq('organization_id', orgId)
        .gte('start_at', from)
        .lte('start_at', to),
    ])
    if (calRes.error) console.error('[calendar] calendars query:', calRes.error.message)
    if (evtRes.error) console.error('[calendar] events query:', evtRes.error.message)
    calendars = (calRes.data ?? []) as CalendarRow[]
    events    = (evtRes.data ?? []) as EventRow[]
  }

  return (
    <CalendarMonthClient
      initialCalendars={calendars}
      initialEvents={events}
    />
  )
}

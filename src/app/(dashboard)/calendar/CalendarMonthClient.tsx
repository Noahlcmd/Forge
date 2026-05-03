'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Calendar } from 'lucide-react'

type CalendarRow = { id: string; name: string; color: string; is_default: boolean; created_at: string }
type EventRow    = { id: string; calendar_id: string; title: string; start_at: string; end_at: string; all_day: boolean }

interface Props {
  initialCalendars: CalendarRow[]
  initialEvents:    EventRow[]
}

const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getCalendarGrid(year: number, month: number) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1)
  // Mon=0..Sun=6
  const startDow = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays    = new Date(year, month, 0).getDate()

  const cells: { date: Date; isCurrentMonth: boolean }[] = []
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevDays - i), isCurrentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, cells.length - daysInMonth - startDow + 1), isCurrentMonth: false })
  }
  return cells
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toLocalDatetimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T09:00`
}

const PRESET_COLORS = ['#f97316','#3b82f6','#8b5cf6','#10b981','#ef4444','#f59e0b','#06b6d4','#ec4899']

export function CalendarMonthClient({ initialCalendars, initialEvents }: Props) {
  const router = useRouter()
  const today  = new Date()

  const [calendars,     setCalendars]     = useState<CalendarRow[]>(initialCalendars)
  const [events,        setEvents]        = useState<EventRow[]>(initialEvents)
  const [viewYear,      setViewYear]      = useState(today.getFullYear())
  const [viewMonth,     setViewMonth]     = useState(today.getMonth())
  const [activeCalIds,  setActiveCalIds]  = useState<Set<string>>(new Set(initialCalendars.map(c => c.id)))

  // New calendar form
  const [showNewCal,    setShowNewCal]    = useState(false)
  const [calName,       setCalName]       = useState('')
  const [newCalColor,   setNewCalColor]   = useState('#3b82f6')
  const [calLoading,    setCalLoading]    = useState(false)
  const [calError,      setCalError]      = useState<string | null>(null)

  // New event form
  const [showNewEvent,  setShowNewEvent]  = useState(false)
  const [evtTitle,      setEvtTitle]      = useState('')
  const [evtCalId,      setEvtCalId]      = useState('')
  const [evtStart,      setEvtStart]      = useState('')
  const [evtEnd,        setEvtEnd]        = useState('')
  const [evtLoading,    setEvtLoading]    = useState(false)
  const [evtError,      setEvtError]      = useState<string | null>(null)
  const [selectedDay,   setSelectedDay]   = useState<Date | null>(null)

  const grid = getCalendarGrid(viewYear, viewMonth)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function toggleCalendar(id: string) {
    setActiveCalIds(prev => {
      const arr = Array.from(prev)
      if (arr.includes(id)) {
        return new Set(arr.filter(x => x !== id))
      }
      return new Set(arr.concat(id))
    })
  }

  function openNewEvent(date?: Date) {
    const base = date ?? today
    setEvtStart(toLocalDatetimeValue(base))
    const endDate = new Date(base); endDate.setHours(10, 0, 0, 0)
    setEvtEnd(toLocalDatetimeValue(endDate))
    setEvtCalId(calendars[0]?.id ?? '')
    setEvtTitle('')
    setEvtError(null)
    setShowNewEvent(true)
  }

  async function createCalendar(e: React.FormEvent) {
    e.preventDefault()
    if (!calName.trim() || calLoading) return
    setCalLoading(true); setCalError(null)
    try {
      const res = await fetch('/api/calendars', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: calName.trim(), color: newCalColor }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed')
      const cal = data as CalendarRow
      setCalendars(prev => [...prev, cal])
      setActiveCalIds(prev => new Set(Array.from(prev).concat(cal.id)))
      setCalName(''); setShowNewCal(false)
      router.refresh()
    } catch (e) { setCalError(e instanceof Error ? e.message : 'Error') }
    finally { setCalLoading(false) }
  }

  async function createEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!evtTitle.trim() || !evtCalId || evtLoading) return
    setEvtLoading(true); setEvtError(null)
    try {
      const startISO = new Date(evtStart).toISOString()
      const endISO   = new Date(evtEnd).toISOString()
      const res = await fetch('/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: evtTitle.trim(), calendar_id: evtCalId, start_at: startISO, end_at: endISO }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed')
      setEvents(prev => [...prev, data as EventRow])
      setShowNewEvent(false)
      router.refresh()
    } catch (e) { setEvtError(e instanceof Error ? e.message : 'Error') }
    finally { setEvtLoading(false) }
  }

  const visibleEvents = events.filter(ev => activeCalIds.has(ev.calendar_id))

  function eventsForDay(date: Date) {
    return visibleEvents.filter(ev => isSameDay(new Date(ev.start_at), date))
  }

  function getCalColor(calId: string) {
    return calendars.find(c => c.id === calId)?.color ?? '#6b7cff'
  }

  return (
    <div className="p-6 space-y-5" style={{ color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-[600] tracking-[-0.4px]">Calendar</h1>
          <p className="text-[13px] mt-[2px]" style={{ color: 'var(--text-muted)' }}>
            {MONTHS[viewMonth]} {viewYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="px-3 py-[6px] rounded-[8px] border text-[13px] font-[500] transition-all"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-[6px] rounded-[8px] border text-[13px] font-[500] transition-all"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => openNewEvent()}
            className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[10px] text-[13px] font-[500] text-white"
            style={{ background: 'var(--color-primary, #f97316)' }}
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
      </div>

      {/* Calendar chips + add calendar */}
      <div className="flex items-center gap-2 flex-wrap">
        {calendars.map(cal => (
          <button
            key={cal.id}
            onClick={() => toggleCalendar(cal.id)}
            className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-[20px] text-[12px] font-[500] transition-all border"
            style={
              activeCalIds.has(cal.id)
                ? { background: cal.color + '22', color: cal.color, borderColor: cal.color + '44' }
                : { background: '#f3f4f6', color: 'var(--text-muted)', borderColor: 'transparent' }
            }
          >
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{ background: activeCalIds.has(cal.id) ? cal.color : '#9ca3af' }}
            />
            {cal.name}
          </button>
        ))}
        {!showNewCal && (
          <button
            onClick={() => setShowNewCal(true)}
            className="inline-flex items-center gap-1 px-3 py-[5px] rounded-[20px] text-[12px] border transition-all"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
          >
            <Plus className="w-3 h-3" /> Add Calendar
          </button>
        )}
        {showNewCal && (
          <form onSubmit={createCalendar} className="flex items-center gap-2 flex-wrap">
            <input
              value={calName}
              onChange={e => setCalName(e.target.value)}
              placeholder="Calendar name"
              autoFocus
              className="px-3 py-[5px] text-[12px] rounded-[8px] border outline-none"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setNewCalColor(c)}
                  className="w-5 h-5 rounded-full transition-all"
                  style={{ background: c, outline: newCalColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }}
                />
              ))}
            </div>
            <button type="submit" disabled={calLoading}
              className="px-3 py-[5px] text-[12px] rounded-[8px] text-white font-[500] disabled:opacity-60"
              style={{ background: 'var(--color-primary, #f97316)' }}
            >
              {calLoading ? '…' : 'Add'}
            </button>
            <button type="button" onClick={() => { setShowNewCal(false); setCalError(null) }}>
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            </button>
            {calError && <span className="text-[11px]" style={{ color: '#e53e3e' }}>{calError}</span>}
          </form>
        )}
      </div>

      {/* Month grid */}
      <div className="forge-card overflow-hidden" style={{ padding: 0 }}>
        {/* Day headers */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--card-border)' }}>
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-[500] uppercase tracking-[0.05em]"
              style={{ background: 'var(--surface-subtle)', color: 'var(--text-muted)' }}>
              {d}
            </div>
          ))}
        </div>
        {/* Cells */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {grid.map((cell, i) => {
            const isToday     = isSameDay(cell.date, today)
            const dayEvents   = eventsForDay(cell.date)
            const isSelected  = selectedDay && isSameDay(cell.date, selectedDay)
            return (
              <div
                key={i}
                onClick={() => { setSelectedDay(cell.date); openNewEvent(cell.date) }}
                className="min-h-[80px] p-2 cursor-pointer transition-colors"
                style={{
                  background: isToday ? 'var(--color-primary-alpha)' : isSelected ? 'var(--color-primary-alpha)' : cell.isCurrentMonth ? 'var(--card-bg)' : 'var(--surface-subtle)',
                  borderRight:  (i + 1) % 7 !== 0 ? '1px solid var(--card-border)' : 'none',
                  borderBottom: i < grid.length - 7 ? '1px solid var(--card-border)' : 'none',
                }}
                title={`${cell.date.toDateString()} — click to add event`}
              >
                <div
                  className="w-[22px] h-[22px] flex items-center justify-center rounded-full mb-[4px] text-[12px] font-[500]"
                  style={
                    isToday
                      ? { background: 'var(--color-primary, #f97316)', color: '#fff' }
                      : isSelected
                        ? { border: '2px solid var(--color-primary, #f97316)', color: 'var(--color-primary, #f97316)' }
                        : { color: cell.isCurrentMonth ? 'var(--text-secondary)' : 'var(--text-muted)' }
                  }
                >
                  {cell.date.getDate()}
                </div>
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className="text-[10px] font-[500] px-[6px] py-[2px] rounded-[3px] mb-[2px] truncate"
                    style={{
                      background: getCalColor(ev.calendar_id) + '22',
                      color:      getCalColor(ev.calendar_id),
                    }}
                    title={ev.title}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* New event modal */}
      {showNewEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowNewEvent(false) }}
        >
          <div
            className="w-full max-w-md rounded-[14px] shadow-xl"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
              <p className="text-[14px] font-[600]">New Event</p>
              <button onClick={() => setShowNewEvent(false)}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={createEvent} className="px-5 py-4 space-y-4">
              <div>
                <label className="text-[12px] mb-1 block" style={{ color: 'var(--text-muted)' }}>Title *</label>
                <input
                  value={evtTitle}
                  onChange={e => setEvtTitle(e.target.value)}
                  placeholder="Event title"
                  required autoFocus
                  className="w-full px-3 py-2 text-[13px] rounded-[8px] border outline-none"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                />
              </div>
              {calendars.length > 0 && (
                <div>
                  <label className="text-[12px] mb-1 block" style={{ color: 'var(--text-muted)' }}>Calendar *</label>
                  <select
                    value={evtCalId}
                    onChange={e => setEvtCalId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-[13px] rounded-[8px] border outline-none"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                  >
                    {calendars.length === 0 && <option value="">No calendars — create one first</option>}
                    {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {calendars.length === 0 && (
                <p className="text-[12px]" style={{ color: '#e53e3e' }}>Create a calendar first before adding events.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] mb-1 block" style={{ color: 'var(--text-muted)' }}>Start *</label>
                  <input
                    type="datetime-local"
                    value={evtStart}
                    onChange={e => setEvtStart(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-[13px] rounded-[8px] border outline-none"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-[12px] mb-1 block" style={{ color: 'var(--text-muted)' }}>End *</label>
                  <input
                    type="datetime-local"
                    value={evtEnd}
                    onChange={e => setEvtEnd(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-[13px] rounded-[8px] border outline-none"
                    style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              {evtError && <p className="text-[12px]" style={{ color: '#e53e3e' }}>{evtError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowNewEvent(false)}
                  className="px-4 py-2 text-[13px] rounded-[8px] border"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={evtLoading || calendars.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-[500] rounded-[8px] text-white disabled:opacity-60"
                  style={{ background: 'var(--color-primary, #f97316)' }}
                >
                  {evtLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                  {evtLoading ? 'Saving…' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

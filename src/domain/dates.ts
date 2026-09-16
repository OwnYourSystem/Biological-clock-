import type { ClockTime, IsoDate } from './types'

const MINUTES_PER_DAY = 24 * 60

export function toIsoDate(d: Date): IsoDate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: IsoDate, delta: number): IsoDate {
  const d = fromIsoDate(iso)
  d.setDate(d.getDate() + delta)
  return toIsoDate(d)
}

export function today(now: Date = new Date()): IsoDate {
  return toIsoDate(now)
}

/** Monday of the week that contains `iso`. */
export function startOfWeek(iso: IsoDate): IsoDate {
  const d = fromIsoDate(iso)
  const offset = (d.getDay() + 6) % 7
  return addDays(iso, -offset)
}

/** The 7 dates of the week starting at `weekStart`. */
export function weekDates(weekStart: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/** The `count` dates ending at `endDate`, oldest first. */
export function dateRange(endDate: IsoDate, count: number): IsoDate[] {
  return Array.from({ length: count }, (_, i) => addDays(endDate, i - count + 1))
}

export function parseClock(time: ClockTime): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function formatClock(minutes: number): ClockTime {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Sleep midpoint. Never stored, always computed, because the straightness of
 * the midpoint line across a week is the whole point of the sleep row.
 * Handles the overnight wrap: 23:30 to 07:30 has a midpoint of 03:30.
 */
export function sleepMidpoint(start: ClockTime | null, end: ClockTime | null): ClockTime | null {
  if (!start || !end) return null
  const s = parseClock(start)
  const e = parseClock(end)
  const span = e >= s ? e - s : e + MINUTES_PER_DAY - s
  return formatClock(s + span / 2)
}

export function sleepDurationMinutes(start: ClockTime | null, end: ClockTime | null): number | null {
  if (!start || !end) return null
  const s = parseClock(start)
  const e = parseClock(end)
  return e >= s ? e - s : e + MINUTES_PER_DAY - s
}

/** Minutes past midnight, used to place an episode mark on the day column. */
export function minuteOfDay(timestamp: number): number {
  const d = new Date(timestamp)
  return d.getHours() * 60 + d.getMinutes()
}

export function shortWeekday(iso: IsoDate): string {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(fromIsoDate(iso).getDay() + 6) % 7]
}

export function humanDate(iso: IsoDate): string {
  const d = fromIsoDate(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function humanTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

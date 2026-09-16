import type { DayRecord, EpisodeRecord, LabRecord, MedEventRecord } from './types'

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(','), ...rows.map((row) => row.map(cell).join(','))].join('\n')
}

/**
 * Exports carry every version, not just the winning one. A clinician who asks
 * "was this edited?" gets an answer.
 */
export function daysCsv(days: DayRecord[]): string {
  return toCsv(
    ['date', 'version', 'sleepStart', 'sleepEnd', 'lightMinutes', 'exertionMinutes', 'heatMax', 'heatFlag', 'loadType', 'symptom', 'orthostaticDelta', 'note', 'createdAt'],
    days.map((d) => [d.date, d.version, d.sleepStart, d.sleepEnd, d.lightMinutes, d.exertionMinutes, d.heatMax, d.heatFlag, d.loadType, d.symptom, d.orthostaticDelta, d.note, new Date(d.createdAt).toISOString()]),
  )
}

export function episodesCsv(episodes: EpisodeRecord[]): string {
  return toCsv(
    ['id', 'version', 'timestamp', 'context', 'duration', 'createdAt'],
    episodes.map((e) => [e.id, e.version, new Date(e.timestamp).toISOString(), e.context, e.duration, new Date(e.createdAt).toISOString()]),
  )
}

export function labsCsv(labs: LabRecord[]): string {
  return toCsv(
    ['date', 'version', 'totalCholesterol', 'ldl', 'hdl', 'triglycerides', 'note', 'createdAt'],
    labs.map((l) => [l.date, l.version, l.totalCholesterol, l.ldl, l.hdl, l.triglycerides, l.note, new Date(l.createdAt).toISOString()]),
  )
}

export function medEventsCsv(events: MedEventRecord[]): string {
  return toCsv(
    ['date', 'version', 'type', 'drug', 'note', 'createdAt'],
    events.map((m) => [m.date, m.version, m.type, m.drug, m.note, new Date(m.createdAt).toISOString()]),
  )
}

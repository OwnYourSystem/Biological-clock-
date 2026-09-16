import { describe, expect, it } from 'vitest'
import { addDays, sleepDurationMinutes, sleepMidpoint, startOfWeek, weekDates } from './dates'
import { bandFor, runsBelowFloor, thresholdsReady } from './exertion'
import { buildLagSeries } from './lag'
import { buildWeek } from './week'
import { latest, nextVersion } from './version'
import { DEFAULT_SETTINGS } from './types'
import type { DayRecord, EpisodeRecord } from './types'

function day(date: string, over: Partial<DayRecord> = {}): DayRecord {
  return {
    date,
    version: 1,
    sleepStart: '23:00',
    sleepEnd: '07:00',
    lightMinutes: '20',
    exertionMinutes: 30,
    heatMax: 20,
    heatFlag: 'none',
    loadType: 'physical',
    symptom: 4,
    note: '',
    orthostaticDelta: null,
    createdAt: 0,
    ...over,
  }
}

function episode(iso: string, hour: number, over: Partial<EpisodeRecord> = {}): EpisodeRecord {
  const [y, m, d] = iso.split('-').map(Number)
  return {
    id: `${iso}-${hour}`,
    version: 1,
    timestamp: new Date(y, m - 1, d, hour, 0).getTime(),
    context: null,
    duration: null,
    createdAt: 0,
    ...over,
  }
}

describe('version resolution', () => {
  it('keeps the highest version per key', () => {
    const rows = [day('2026-09-01'), day('2026-09-01', { version: 3, symptom: 9 }), day('2026-09-01', { version: 2, symptom: 7 })]
    const resolved = latest(rows, (d) => d.date)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].version).toBe(3)
    expect(resolved[0].symptom).toBe(9)
  })

  it('keeps every date separate', () => {
    const rows = [day('2026-09-01'), day('2026-09-02', { version: 5 })]
    expect(latest(rows, (d) => d.date)).toHaveLength(2)
  })

  it('numbers the next version above the highest seen, not the count', () => {
    expect(nextVersion([])).toBe(1)
    expect(nextVersion([{ version: 1 }, { version: 4 }, { version: 2 }])).toBe(5)
  })
})

describe('sleep midpoint', () => {
  it('handles the overnight wrap', () => {
    expect(sleepMidpoint('23:30', '07:30')).toBe('03:30')
  })

  it('handles a same-day nap', () => {
    expect(sleepMidpoint('13:00', '15:00')).toBe('14:00')
  })

  it('returns null when either end is missing', () => {
    expect(sleepMidpoint('23:00', null)).toBeNull()
    expect(sleepMidpoint(null, '07:00')).toBeNull()
  })

  it('measures duration across midnight', () => {
    expect(sleepDurationMinutes('23:30', '07:00')).toBe(450)
  })
})

describe('floor and ceiling comparison', () => {
  const settings = { exertionFloorMinutes: 20, exertionCeilingMinutes: 45 }

  it('bands a value against the clinician numbers', () => {
    expect(bandFor(10, settings)).toBe('below')
    expect(bandFor(30, settings)).toBe('inRange')
    expect(bandFor(60, settings)).toBe('above')
  })

  it('says nothing when the numbers are not set', () => {
    expect(bandFor(30, { exertionFloorMinutes: null, exertionCeilingMinutes: null })).toBe('unknown')
    expect(bandFor(null, settings)).toBe('unknown')
  })

  it('reports thresholds ready only when all 3 are present', () => {
    expect(thresholdsReady(DEFAULT_SETTINGS)).toBe(false)
    expect(
      thresholdsReady({ ...DEFAULT_SETTINGS, hrThresholdBpm: 110, exertionFloorMinutes: 20, exertionCeilingMinutes: 45 }),
    ).toBe(true)
  })

  it('finds runs of 3 or more days below the floor', () => {
    expect(runsBelowFloor([5, 5, 5, 40, 2, 2], 20)).toEqual([{ start: 0, length: 3 }])
  })

  it('does not flag a run of 2', () => {
    expect(runsBelowFloor([5, 5, 40, 5, 5], 20)).toEqual([])
  })

  it('treats an unlogged day as a break, not a low day', () => {
    expect(runsBelowFloor([5, 5, null, 5, 5], 20)).toEqual([])
  })

  it('returns nothing when no floor is set', () => {
    expect(runsBelowFloor([0, 0, 0, 0], null)).toEqual([])
  })
})

describe('week rollup', () => {
  const weekStart = startOfWeek('2026-09-16')
  const settings = { exertionFloorMinutes: 20, exertionCeilingMinutes: 45 }

  it('always returns 7 columns, logged or not', () => {
    const week = buildWeek(weekStart, [day(weekStart)], [], [], settings)
    expect(week.columns).toHaveLength(7)
    expect(week.loggedDays).toBe(1)
    expect(week.columns[1].day).toBeNull()
  })

  it('starts the week on Monday', () => {
    expect(startOfWeek('2026-09-16')).toBe('2026-09-14')
    expect(weekDates('2026-09-14')[6]).toBe('2026-09-20')
  })

  it('places episodes on their own day and orders them by time', () => {
    const dates = weekDates(weekStart)
    const week = buildWeek(weekStart, [], [episode(dates[2], 22), episode(dates[2], 6)], [], settings)
    expect(week.columns[2].episodes.map((e) => e.minuteOfDay)).toEqual([360, 1320])
    expect(week.episodeCount).toBe(2)
  })

  it('computes the midpoint per column without storing it', () => {
    const week = buildWeek(weekStart, [day(weekStart, { sleepStart: '00:30', sleepEnd: '08:30' })], [], [], settings)
    expect(week.columns[0].sleepMidpoint).toBe('04:30')
  })

  it('marks a run of 3 low days', () => {
    const dates = weekDates(weekStart)
    const days = dates.slice(0, 3).map((d) => day(d, { exertionMinutes: 5 }))
    const week = buildWeek(weekStart, days, [], [], settings)
    expect(week.belowFloorRuns).toEqual([{ start: 0, length: 3 }])
  })

  it('scales the exertion axis to at least the ceiling', () => {
    const week = buildWeek(weekStart, [day(weekStart, { exertionMinutes: 5 })], [], [], settings)
    expect(week.exertionMax).toBeGreaterThanOrEqual(45)
  })
})

describe('lag alignment', () => {
  it('pairs each input day with the symptom of the day after', () => {
    const days = [
      day('2026-09-14', { exertionMinutes: 60, symptom: 2 }),
      day('2026-09-15', { exertionMinutes: 10, symptom: 8 }),
    ]
    const series = buildLagSeries('exertion', '2026-09-15', 2, days, [])
    expect(series.points[0]).toMatchObject({ date: '2026-09-14', input: 60, nextSymptom: 8 })
  })

  it('leaves the last day unpaired until tomorrow is logged', () => {
    const days = [day('2026-09-15', { exertionMinutes: 10 })]
    const series = buildLagSeries('exertion', '2026-09-15', 1, days, [])
    expect(series.points[0].nextSymptom).toBeNull()
    expect(series.pairedDays).toBe(0)
  })

  it('counts episodes per day as an input', () => {
    const days = [day('2026-09-14'), day('2026-09-15', { symptom: 6 })]
    const series = buildLagSeries('episodes', '2026-09-15', 2, days, [
      episode('2026-09-14', 9),
      episode('2026-09-14', 11),
    ])
    expect(series.points[0].input).toBe(2)
    expect(series.points[0].nextSymptom).toBe(6)
  })

  it('returns one point per day in the window', () => {
    const series = buildLagSeries('heat', '2026-09-15', 28, [], [])
    expect(series.points).toHaveLength(28)
    expect(series.points[27].date).toBe('2026-09-15')
    expect(series.points[0].date).toBe(addDays('2026-09-15', -27))
  })
})

import { minuteOfDay, sleepDurationMinutes, sleepMidpoint, weekDates } from './dates'
import { runsBelowFloor, type Run } from './exertion'
import type { DayRecord, EpisodeRecord, IsoDate, MedEventRecord, Settings } from './types'

export interface EpisodeMark {
  id: string
  timestamp: number
  minuteOfDay: number
  context: EpisodeRecord['context']
  duration: EpisodeRecord['duration']
}

export interface DayColumn {
  date: IsoDate
  day: DayRecord | null
  sleepStart: string | null
  sleepEnd: string | null
  sleepMidpoint: string | null
  sleepMinutes: number | null
  episodes: EpisodeMark[]
  medEvents: MedEventRecord[]
}

export interface WeekRollup {
  weekStart: IsoDate
  columns: DayColumn[]
  exertionValues: (number | null)[]
  exertionMax: number
  belowFloorRuns: Run[]
  episodeCount: number
  loggedDays: number
}

/**
 * Build the 7 columns of the week view from resolved records.
 * Pure: callers pass records that already went through version resolution.
 */
export function buildWeek(
  weekStart: IsoDate,
  days: DayRecord[],
  episodes: EpisodeRecord[],
  medEvents: MedEventRecord[],
  settings: Pick<Settings, 'exertionFloorMinutes' | 'exertionCeilingMinutes'>,
): WeekRollup {
  const dates = weekDates(weekStart)
  const dayByDate = new Map(days.map((d) => [d.date, d]))

  const episodesByDate = new Map<IsoDate, EpisodeMark[]>()
  for (const episode of episodes) {
    const d = new Date(episode.timestamp)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const marks = episodesByDate.get(iso) ?? []
    marks.push({
      id: episode.id,
      timestamp: episode.timestamp,
      minuteOfDay: minuteOfDay(episode.timestamp),
      context: episode.context,
      duration: episode.duration,
    })
    episodesByDate.set(iso, marks)
  }

  const medsByDate = new Map<IsoDate, MedEventRecord[]>()
  for (const event of medEvents) {
    const list = medsByDate.get(event.date) ?? []
    list.push(event)
    medsByDate.set(event.date, list)
  }

  const columns: DayColumn[] = dates.map((date) => {
    const day = dayByDate.get(date) ?? null
    return {
      date,
      day,
      sleepStart: day?.sleepStart ?? null,
      sleepEnd: day?.sleepEnd ?? null,
      sleepMidpoint: sleepMidpoint(day?.sleepStart ?? null, day?.sleepEnd ?? null),
      sleepMinutes: sleepDurationMinutes(day?.sleepStart ?? null, day?.sleepEnd ?? null),
      episodes: (episodesByDate.get(date) ?? []).sort((a, b) => a.timestamp - b.timestamp),
      medEvents: medsByDate.get(date) ?? [],
    }
  })

  const exertionValues = columns.map((c) => c.day?.exertionMinutes ?? null)
  const ceiling = settings.exertionCeilingMinutes ?? 0
  const exertionMax = Math.max(10, ceiling, ...exertionValues.map((v) => v ?? 0))

  return {
    weekStart,
    columns,
    exertionValues,
    exertionMax,
    belowFloorRuns: runsBelowFloor(exertionValues, settings.exertionFloorMinutes),
    episodeCount: columns.reduce((sum, c) => sum + c.episodes.length, 0),
    loggedDays: columns.filter((c) => c.day !== null).length,
  }
}

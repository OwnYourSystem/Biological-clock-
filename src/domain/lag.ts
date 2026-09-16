import { addDays, dateRange } from './dates'
import { LIGHT_STEPS } from './types'
import type { DayRecord, EpisodeRecord, IsoDate } from './types'

export type LagInput = 'exertion' | 'heat' | 'load' | 'episodes' | 'light' | 'sleep'

export const LAG_INPUT_LABELS: Record<LagInput, string> = {
  exertion: 'Exertion',
  heat: 'Heat',
  load: 'Load type',
  episodes: 'Episodes',
  light: 'Morning light',
  sleep: 'Sleep length',
}

export interface LagPoint {
  date: IsoDate
  /** The chosen input, measured on `date`. */
  input: number | null
  /** Symptom measured on the day after `date`. */
  nextSymptom: number | null
}

export interface LagSeries {
  input: LagInput
  points: LagPoint[]
  inputMax: number
  /** Days where both the input and the next-day symptom exist. */
  pairedDays: number
}

const LOAD_WEIGHT = { physical: 1, sensory: 2, social: 3 }

function inputValue(
  input: LagInput,
  day: DayRecord | undefined,
  episodeCount: number,
): number | null {
  switch (input) {
    case 'exertion':
      return day?.exertionMinutes ?? null
    case 'heat':
      return day?.heatMax ?? null
    case 'load':
      return day?.loadType ? LOAD_WEIGHT[day.loadType] : null
    case 'episodes':
      return episodeCount
    case 'light':
      return day?.lightMinutes ? LIGHT_STEPS[day.lightMinutes] : null
    case 'sleep':
      return day?.sleepStart && day?.sleepEnd ? 1 : null
  }
}

/**
 * Align a chosen input against symptom shifted forward one day.
 *
 * No correlation coefficient and no causal claim is produced anywhere in this
 * module, by design. The user looks at the 2 lines and decides.
 */
export function buildLagSeries(
  input: LagInput,
  endDate: IsoDate,
  windowDays: number,
  days: DayRecord[],
  episodes: EpisodeRecord[],
  sleepMinutesByDate?: Map<IsoDate, number | null>,
): LagSeries {
  const dates = dateRange(endDate, windowDays)
  const dayByDate = new Map(days.map((d) => [d.date, d]))

  const episodeCounts = new Map<IsoDate, number>()
  for (const episode of episodes) {
    const d = new Date(episode.timestamp)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    episodeCounts.set(iso, (episodeCounts.get(iso) ?? 0) + 1)
  }

  const points: LagPoint[] = dates.map((date) => {
    const day = dayByDate.get(date)
    const raw =
      input === 'sleep'
        ? (sleepMinutesByDate?.get(date) ?? null)
        : inputValue(input, day, episodeCounts.get(date) ?? 0)
    return {
      date,
      input: raw,
      nextSymptom: dayByDate.get(addDays(date, 1))?.symptom ?? null,
    }
  })

  const inputMax = Math.max(1, ...points.map((p) => p.input ?? 0))

  return {
    input,
    points,
    inputMax,
    pairedDays: points.filter((p) => p.input !== null && p.nextSymptom !== null).length,
  }
}

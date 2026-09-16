import type { Settings } from './types'

export type ExertionBand = 'unknown' | 'below' | 'inRange' | 'above'

/**
 * Compare a day's exertion against the floor and the ceiling.
 * Both come from the user's cardiologist. When either is unset the app has
 * nothing to say, so the band is 'unknown'. No threshold is ever derived,
 * estimated or suggested here.
 */
export function bandFor(minutes: number | null, settings: Pick<Settings, 'exertionFloorMinutes' | 'exertionCeilingMinutes'>): ExertionBand {
  const { exertionFloorMinutes: floor, exertionCeilingMinutes: ceiling } = settings
  if (minutes === null || floor === null || ceiling === null) return 'unknown'
  if (minutes < floor) return 'below'
  if (minutes > ceiling) return 'above'
  return 'inRange'
}

/** True once the cardiologist's numbers are in and the exertion field can go live. */
export function thresholdsReady(settings: Settings): boolean {
  return (
    settings.hrThresholdBpm !== null &&
    settings.exertionFloorMinutes !== null &&
    settings.exertionCeilingMinutes !== null
  )
}

export interface Run {
  start: number
  length: number
}

/**
 * Runs of `minLength` or more consecutive days below the floor.
 * A missing day breaks the run: an unlogged day is not a low day.
 */
export function runsBelowFloor(values: (number | null)[], floor: number | null, minLength = 3): Run[] {
  if (floor === null) return []
  const runs: Run[] = []
  let start = -1
  let length = 0

  const flush = () => {
    if (length >= minLength) runs.push({ start, length })
    start = -1
    length = 0
  }

  values.forEach((value, index) => {
    if (value !== null && value < floor) {
      if (length === 0) start = index
      length += 1
    } else {
      flush()
    }
  })
  flush()

  return runs
}

export function isInRun(index: number, runs: Run[]): boolean {
  return runs.some((run) => index >= run.start && index < run.start + run.length)
}

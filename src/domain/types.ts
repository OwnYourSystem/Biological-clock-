/** Domain types. No I/O lives in this layer. */

/** ISO calendar date, 'YYYY-MM-DD'. */
export type IsoDate = string
/** Wall clock time, 'HH:MM'. */
export type ClockTime = string

export type LightBucket = '0' | '10' | '20' | '30plus'
export type HeatFlag = 'none' | 'bath' | 'sun' | 'fever'
export type LoadType = 'physical' | 'sensory' | 'social'
export type EpisodeContext = 'rest' | 'standing' | 'exertion' | 'sleep'
export type EpisodeDuration = 'under1' | '1to10' | 'over10'
export type MedEventType = 'start' | 'stop' | 'doseChange'

/**
 * One evening entry. Append-only: an edit writes a new row with the next
 * version for the same date. Readers resolve the highest version per date.
 */
export interface DayRecord {
  id?: number
  date: IsoDate
  version: number
  sleepStart: ClockTime | null
  sleepEnd: ClockTime | null
  lightMinutes: LightBucket | null
  exertionMinutes: number | null
  heatMax: number | null
  heatFlag: HeatFlag
  loadType: LoadType | null
  symptom: number | null
  note: string
  orthostaticDelta: number | null
  createdAt: number
}

/**
 * One arrhythmia event. The timestamp is set on the button tap and is never
 * editable. Context and duration are annotated after the episode ends, which
 * appends a new version carrying the same id and the original timestamp.
 */
export interface EpisodeRecord {
  key?: number
  id: string
  version: number
  timestamp: number
  context: EpisodeContext | null
  duration: EpisodeDuration | null
  createdAt: number
}

export interface LabRecord {
  id?: number
  date: IsoDate
  version: number
  totalCholesterol: number | null
  ldl: number | null
  hdl: number | null
  triglycerides: number | null
  note: string
  createdAt: number
}

export interface MedEventRecord {
  id?: number
  date: IsoDate
  version: number
  type: MedEventType
  drug: string
  note: string
  createdAt: number
}

export interface Settings {
  id: 1
  /** Beats per minute above which time counts as exertion. Set by a cardiologist. */
  hrThresholdBpm: number | null
  /** Weekly floor, in minutes. Below it for 3 days running is the pattern to see. */
  exertionFloorMinutes: number | null
  /** Ceiling, in minutes. Above it is overreach. */
  exertionCeilingMinutes: number | null
  reminderTimeMorning: ClockTime
  reminderTimeEvening: ClockTime
  orthostaticEnabled: boolean
  lastBackupAt: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  id: 1,
  // No threshold is shipped, derived, estimated or suggested. See spec 2.3.2.
  hrThresholdBpm: null,
  exertionFloorMinutes: null,
  exertionCeilingMinutes: null,
  reminderTimeMorning: '08:00',
  reminderTimeEvening: '21:00',
  orthostaticEnabled: false,
  lastBackupAt: null,
}

export const LIGHT_STEPS: Record<LightBucket, number> = {
  '0': 0,
  '10': 1,
  '20': 2,
  '30plus': 3,
}

export const LIGHT_LABELS: Record<LightBucket, string> = {
  '0': 'None',
  '10': '10 min',
  '20': '20 min',
  '30plus': '30+ min',
}

export const HEAT_LABELS: Record<HeatFlag, string> = {
  none: 'None',
  bath: 'Bath',
  sun: 'Sun',
  fever: 'Fever',
}

export const LOAD_LABELS: Record<LoadType, string> = {
  physical: 'Physical',
  sensory: 'Sensory',
  social: 'Social',
}

export const CONTEXT_LABELS: Record<EpisodeContext, string> = {
  rest: 'At rest',
  standing: 'Standing',
  exertion: 'Exertion',
  sleep: 'Asleep',
}

export const DURATION_LABELS: Record<EpisodeDuration, string> = {
  under1: 'Under 1 min',
  '1to10': '1 to 10 min',
  over10: 'Over 10 min',
}

export const MED_EVENT_LABELS: Record<MedEventType, string> = {
  start: 'Started',
  stop: 'Stopped',
  doseChange: 'Dose change',
}

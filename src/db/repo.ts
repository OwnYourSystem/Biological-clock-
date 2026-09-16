import { latest, nextVersion } from '../domain/version'
import { DEFAULT_SETTINGS } from '../domain/types'
import type {
  DayRecord,
  EpisodeRecord,
  IsoDate,
  LabRecord,
  MedEventRecord,
  Settings,
} from '../domain/types'
import { db, type HealthLogDb } from './schema'

/**
 * The storage adapter. One interface between the app and persistence.
 * IndexedDB is the only implementation at launch. Drive backup sits behind
 * the same interface, so it never becomes a second source of truth.
 */
export interface HealthStore {
  latestDays(): Promise<DayRecord[]>
  allDays(): Promise<DayRecord[]>
  dayFor(date: IsoDate): Promise<DayRecord | null>
  saveDay(input: DayInput): Promise<DayRecord>

  latestEpisodes(): Promise<EpisodeRecord[]>
  allEpisodes(): Promise<EpisodeRecord[]>
  startEpisode(timestamp?: number): Promise<EpisodeRecord>
  annotateEpisode(id: string, patch: EpisodePatch): Promise<EpisodeRecord>

  latestLabs(): Promise<LabRecord[]>
  allLabs(): Promise<LabRecord[]>
  saveLab(input: LabInput): Promise<LabRecord>

  latestMedEvents(): Promise<MedEventRecord[]>
  allMedEvents(): Promise<MedEventRecord[]>
  saveMedEvent(input: MedEventInput): Promise<MedEventRecord>

  readSettings(): Promise<Settings>
  writeSettings(patch: Partial<Settings>): Promise<Settings>
}

export type DayInput = Omit<DayRecord, 'id' | 'version' | 'createdAt'>
export type LabInput = Omit<LabRecord, 'id' | 'version' | 'createdAt'>
export type MedEventInput = Omit<MedEventRecord, 'id' | 'version' | 'createdAt'>
export type EpisodePatch = Pick<EpisodeRecord, 'context' | 'duration'>

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `ep-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export function createStore(database: HealthLogDb = db): HealthStore {
  return {
    async allDays() {
      return database.days.toArray()
    },

    async latestDays() {
      return latest(await database.days.toArray(), (d) => d.date).sort((a, b) =>
        a.date.localeCompare(b.date),
      )
    },

    async dayFor(date) {
      const rows = await database.days.where('date').equals(date).toArray()
      if (rows.length === 0) return null
      return rows.reduce((best, row) => (row.version > best.version ? row : best))
    },

    /** An edit never overwrites. It appends the next version for that date. */
    async saveDay(input) {
      const existing = await database.days.where('date').equals(input.date).toArray()
      const record: DayRecord = {
        ...input,
        version: nextVersion(existing),
        createdAt: Date.now(),
      }
      const id = await database.days.add(record)
      return { ...record, id }
    },

    async allEpisodes() {
      return database.episodes.toArray()
    },

    async latestEpisodes() {
      return latest(await database.episodes.toArray(), (e) => e.id).sort(
        (a, b) => a.timestamp - b.timestamp,
      )
    },

    /**
     * The button tap. Write first, validate never: an episode is a fact, and
     * the fields that need thought are asked for after it ends.
     */
    async startEpisode(timestamp = Date.now()) {
      const record: EpisodeRecord = {
        id: uuid(),
        version: 1,
        timestamp,
        context: null,
        duration: null,
        createdAt: Date.now(),
      }
      const key = await database.episodes.add(record)
      return { ...record, key }
    },

    /** The timestamp is carried forward untouched. It is never editable. */
    async annotateEpisode(id, patch) {
      const rows = await database.episodes.where('id').equals(id).toArray()
      if (rows.length === 0) throw new Error(`Unknown episode ${id}`)
      const current = rows.reduce((best, row) => (row.version > best.version ? row : best))
      const record: EpisodeRecord = {
        id,
        version: nextVersion(rows),
        timestamp: current.timestamp,
        context: patch.context,
        duration: patch.duration,
        createdAt: Date.now(),
      }
      const key = await database.episodes.add(record)
      return { ...record, key }
    },

    async allLabs() {
      return database.labs.toArray()
    },

    async latestLabs() {
      return latest(await database.labs.toArray(), (l) => l.date).sort((a, b) =>
        b.date.localeCompare(a.date),
      )
    },

    async saveLab(input) {
      const existing = await database.labs.where('date').equals(input.date).toArray()
      const record: LabRecord = { ...input, version: nextVersion(existing), createdAt: Date.now() }
      const id = await database.labs.add(record)
      return { ...record, id }
    },

    async allMedEvents() {
      return database.medEvents.toArray()
    },

    async latestMedEvents() {
      return latest(await database.medEvents.toArray(), (m) => `${m.date}|${m.drug}|${m.type}`).sort(
        (a, b) => b.date.localeCompare(a.date),
      )
    },

    async saveMedEvent(input) {
      const existing = await database.medEvents
        .where('date')
        .equals(input.date)
        .filter((m) => m.drug === input.drug && m.type === input.type)
        .toArray()
      const record: MedEventRecord = {
        ...input,
        version: nextVersion(existing),
        createdAt: Date.now(),
      }
      const id = await database.medEvents.add(record)
      return { ...record, id }
    },

    async readSettings() {
      const stored = await database.settings.get(1)
      return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS
    },

    async writeSettings(patch) {
      const current = await this.readSettings()
      const next: Settings = { ...current, ...patch, id: 1 }
      await database.settings.put(next)
      return next
    },
  }
}

export const store = createStore()

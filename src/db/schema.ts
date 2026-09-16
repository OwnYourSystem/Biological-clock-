import Dexie, { type Table } from 'dexie'
import type { DayRecord, EpisodeRecord, LabRecord, MedEventRecord, Settings } from '../domain/types'

/**
 * The local store. IndexedDB via Dexie, code-first schema.
 *
 * Every table is append-only. Compound indexes carry the natural key plus the
 * version, so a read can walk straight to the newest row for a key and the
 * older rows stay where they are.
 */
export class HealthLogDb extends Dexie {
  days!: Table<DayRecord, number>
  episodes!: Table<EpisodeRecord, number>
  labs!: Table<LabRecord, number>
  medEvents!: Table<MedEventRecord, number>
  settings!: Table<Settings, number>

  constructor(name = 'health-log') {
    super(name)
    this.version(1).stores({
      days: '++id, date, [date+version], createdAt',
      episodes: '++key, id, [id+version], timestamp',
      labs: '++id, date, [date+version]',
      medEvents: '++id, date, [date+version]',
      settings: 'id',
    })
  }
}

export const db = new HealthLogDb()

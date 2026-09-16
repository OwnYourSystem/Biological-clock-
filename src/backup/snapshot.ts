import { store } from '../db/repo'
import type { DayRecord, EpisodeRecord, LabRecord, MedEventRecord, Settings } from '../domain/types'

export const SNAPSHOT_NAME = 'health-log-snapshot.json'
export const SNAPSHOT_VERSION = 1

export interface Snapshot {
  snapshotVersion: number
  exportedAt: string
  days: DayRecord[]
  episodes: EpisodeRecord[]
  labs: LabRecord[]
  medEvents: MedEventRecord[]
  settings: Settings
}

/** Every version of every record, not just the winning ones. */
export async function createSnapshot(): Promise<Snapshot> {
  const [days, episodes, labs, medEvents, settings] = await Promise.all([
    store.allDays(),
    store.allEpisodes(),
    store.allLabs(),
    store.allMedEvents(),
    store.readSettings(),
  ])
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    days,
    episodes,
    labs,
    medEvents,
    settings,
  }
}

export function download(filename: string, contents: string, mime = 'text/plain') {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Days since the last successful backup, or null if there has never been one. */
export function daysSince(timestamp: number | null): number | null {
  if (timestamp === null) return null
  return Math.floor((Date.now() - timestamp) / 86_400_000)
}

export const BACKUP_WARN_DAYS = 7

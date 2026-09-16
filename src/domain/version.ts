/**
 * Version resolution for the append-only store.
 *
 * Nothing is ever updated in place. An edit writes a new row with the next
 * version for the same natural key. Every read passes through here and takes
 * the highest version per key. A medical log that silently rewrites its own
 * history is worthless to a clinician, so the older rows stay on disk and
 * ship with the export.
 */
export interface Versioned {
  version: number
}

export function latestPerKey<T extends Versioned>(rows: T[], keyOf: (row: T) => string): Map<string, T> {
  const winners = new Map<string, T>()
  for (const row of rows) {
    const key = keyOf(row)
    const current = winners.get(key)
    if (!current || row.version > current.version) winners.set(key, row)
  }
  return winners
}

export function latest<T extends Versioned>(rows: T[], keyOf: (row: T) => string): T[] {
  return [...latestPerKey(rows, keyOf).values()]
}

export function nextVersion<T extends Versioned>(rows: T[]): number {
  return rows.reduce((max, row) => Math.max(max, row.version), 0) + 1
}

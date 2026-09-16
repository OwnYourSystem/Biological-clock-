import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStore } from './repo'
import { HealthLogDb } from './schema'

/**
 * The append-only guarantee is the one thing that makes this log worth showing
 * to a clinician, so it is tested even though the spec limits tests to the
 * domain layer.
 */
describe('append-only store', () => {
  let db: HealthLogDb
  let store: ReturnType<typeof createStore>

  beforeEach(async () => {
    db = new HealthLogDb(`test-${Math.random()}`)
    await db.open()
    store = createStore(db)
  })

  const draft = {
    date: '2026-09-16',
    sleepStart: '23:00',
    sleepEnd: '07:00',
    lightMinutes: '20' as const,
    exertionMinutes: 20,
    heatMax: 19,
    heatFlag: 'none' as const,
    loadType: 'sensory' as const,
    symptom: 5,
    note: '',
    orthostaticDelta: null,
  }

  it('keeps the old row when a day is edited', async () => {
    await store.saveDay(draft)
    await store.saveDay({ ...draft, symptom: 8 })

    const all = await store.allDays()
    expect(all).toHaveLength(2)
    expect(all.map((d) => d.version).sort()).toEqual([1, 2])

    const resolved = await store.latestDays()
    expect(resolved).toHaveLength(1)
    expect(resolved[0].symptom).toBe(8)
  })

  it('never moves an episode timestamp when it is annotated', async () => {
    const started = await store.startEpisode(1_600_000_000_000)
    const annotated = await store.annotateEpisode(started.id, { context: 'rest', duration: '1to10' })

    expect(annotated.timestamp).toBe(started.timestamp)
    expect(annotated.version).toBe(2)
    expect(await store.allEpisodes()).toHaveLength(2)

    const resolved = await store.latestEpisodes()
    expect(resolved).toHaveLength(1)
    expect(resolved[0].context).toBe('rest')
  })

  it('ships no thresholds until a clinician supplies them', async () => {
    const settings = await store.readSettings()
    expect(settings.hrThresholdBpm).toBeNull()
    expect(settings.exertionFloorMinutes).toBeNull()
    expect(settings.exertionCeilingMinutes).toBeNull()
  })
})

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../db/repo'
import { addDays, fromIsoDate, humanDate, today } from '../domain/dates'
import { bandFor } from '../domain/exertion'
import { CONTEXT_LABELS, DURATION_LABELS, MED_EVENT_LABELS } from '../domain/types'
import type { EpisodeContext } from '../domain/types'
import { Card, FieldLabel, PrimaryButton, ScreenTitle } from '../ui/primitives'
import { Screen } from '../ui/shell'

const RANGES = [30, 90, 180] as const

function bucketOf(hour: number): string {
  if (hour < 6) return '00 to 06'
  if (hour < 12) return '06 to 12'
  if (hour < 18) return '12 to 18'
  return '18 to 24'
}

/**
 * Built for a 10 minute consultation, not for browsing. Episode frequency and
 * clustering, symptom trend, exertion against the floor and the ceiling, and
 * the medication markers. Printed through the browser, so it becomes a PDF
 * without a PDF library or a third party.
 */
export function Report() {
  const [rangeDays, setRangeDays] = useState<(typeof RANGES)[number]>(90)
  const end = today()
  const start = addDays(end, -(rangeDays - 1))

  const data = useLiveQuery(async () => {
    const [days, episodes, labs, meds, settings] = await Promise.all([
      store.latestDays(),
      store.latestEpisodes(),
      store.latestLabs(),
      store.latestMedEvents(),
      store.readSettings(),
    ])
    return { days, episodes, labs, meds, settings }
  }, [])

  if (!data) return <Screen><ScreenTitle title="Report" /></Screen>

  const days = data.days.filter((d) => d.date >= start && d.date <= end)
  const startMs = fromIsoDate(start).getTime()
  const endMs = fromIsoDate(end).getTime() + 86_400_000
  const episodes = data.episodes.filter((e) => e.timestamp >= startMs && e.timestamp < endMs)
  const meds = data.meds.filter((m) => m.date >= start && m.date <= end)

  const symptoms = days.map((d) => d.symptom).filter((s): s is number => s !== null)
  const meanSymptom = symptoms.length ? symptoms.reduce((a, b) => a + b, 0) / symptoms.length : null
  const half = Math.floor(days.length / 2)
  const meanOf = (slice: typeof days) => {
    const values = slice.map((d) => d.symptom).filter((s): s is number => s !== null)
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  }
  const firstHalf = meanOf(days.slice(0, half))
  const secondHalf = meanOf(days.slice(half))

  const buckets = new Map<string, number>()
  for (const episode of episodes) {
    const key = bucketOf(new Date(episode.timestamp).getHours())
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  const contexts = new Map<EpisodeContext, number>()
  for (const episode of episodes) {
    if (episode.context) contexts.set(episode.context, (contexts.get(episode.context) ?? 0) + 1)
  }

  const exertionDays = days.filter((d) => d.exertionMinutes !== null)
  const belowCount = exertionDays.filter((d) => bandFor(d.exertionMinutes, data.settings) === 'below').length
  const aboveCount = exertionDays.filter((d) => bandFor(d.exertionMinutes, data.settings) === 'above').length

  const weeks = Math.max(1, rangeDays / 7)

  return (
    <Screen>
      <div className="no-print flex flex-col gap-3">
        <ScreenTitle title="Report" subtitle="Print this, or save it as a PDF from the print dialog." />
        <Card>
          <FieldLabel>Range</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {RANGES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRangeDays(value)}
                className={`min-h-14 rounded-2xl border text-base font-medium ${
                  rangeDays === value
                    ? 'border-brand-400 bg-brand-500 text-white'
                    : 'border-ink-600 bg-ink-800 text-ink-100'
                }`}
              >
                {value} days
              </button>
            ))}
          </div>
        </Card>
        <PrimaryButton onClick={() => window.print()}>Print or save as PDF</PrimaryButton>
      </div>

      <article className="flex flex-col gap-4 rounded-card bg-white p-5 text-black print:rounded-none print:p-0">
        <header>
          <h1 className="text-xl font-bold">Health log summary</h1>
          <p className="text-sm">
            {humanDate(start)} to {humanDate(end)} · {days.length} of {rangeDays} days logged
          </p>
        </header>

        <section>
          <h2 className="font-semibold">Episodes</h2>
          <p className="text-sm">
            {episodes.length} recorded, about {(episodes.length / weeks).toFixed(1)} per week.
          </p>
          {buckets.size > 0 ? (
            <table className="mt-1 text-sm">
              <tbody>
                {[...buckets.entries()].sort().map(([bucket, count]) => (
                  <tr key={bucket}>
                    <td className="py-0.5 pr-3">{bucket}</td>
                    <td className="py-0.5 tabular-nums">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {contexts.size > 0 ? (
            <p className="mt-1 text-sm">
              Context:{' '}
              {[...contexts.entries()]
                .map(([context, count]) => `${CONTEXT_LABELS[context]} ${count}`)
                .join(', ')}
              .
            </p>
          ) : null}
          {episodes.some((e) => e.duration === 'over10') ? (
            <p className="mt-1 text-sm">
              {episodes.filter((e) => e.duration === 'over10').length} lasted{' '}
              {DURATION_LABELS.over10.toLowerCase()}.
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="font-semibold">Symptom</h2>
          <p className="text-sm">
            Mean {meanSymptom !== null ? meanSymptom.toFixed(1) : '—'} of 10.
            {firstHalf !== null && secondHalf !== null
              ? ` First half ${firstHalf.toFixed(1)}, second half ${secondHalf.toFixed(1)}.`
              : ''}
          </p>
        </section>

        <section>
          <h2 className="font-semibold">Exertion</h2>
          {data.settings.exertionFloorMinutes === null ? (
            <p className="text-sm">
              No floor or ceiling has been set, so nothing is compared. These numbers come from the
              cardiologist.
            </p>
          ) : (
            <p className="text-sm">
              Floor {data.settings.exertionFloorMinutes} min, ceiling{' '}
              {data.settings.exertionCeilingMinutes} min, measured above{' '}
              {data.settings.hrThresholdBpm} bpm. {belowCount} days below the floor, {aboveCount}{' '}
              above the ceiling, out of {exertionDays.length} logged.
            </p>
          )}
        </section>

        {meds.length > 0 ? (
          <section>
            <h2 className="font-semibold">Medication changes</h2>
            <ul className="text-sm">
              {meds.map((m) => (
                <li key={`${m.date}-${m.drug}-${m.type}`}>
                  {m.date}: {MED_EVENT_LABELS[m.type]} {m.drug}
                  {m.note ? ` (${m.note})` : ''}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {data.labs.length > 0 ? (
          <section>
            <h2 className="font-semibold">Most recent lipid panel</h2>
            <p className="text-sm tabular-nums">
              {data.labs[0].date}: total {data.labs[0].totalCholesterol ?? '—'}, LDL{' '}
              {data.labs[0].ldl ?? '—'}, HDL {data.labs[0].hdl ?? '—'}, triglycerides{' '}
              {data.labs[0].triglycerides ?? '—'} mmol/L
            </p>
          </section>
        ) : null}

        <footer className="border-t pt-2 text-xs">
          Self-reported log. It does not diagnose, advise or alert. Every threshold in it was set by
          a clinician.
        </footer>
      </article>
    </Screen>
  )
}

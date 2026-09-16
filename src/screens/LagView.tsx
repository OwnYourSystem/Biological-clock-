import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../db/repo'
import { fromIsoDate, sleepDurationMinutes, today } from '../domain/dates'
import { buildLagSeries, LAG_INPUT_LABELS, type LagInput } from '../domain/lag'
import { MED_EVENT_LABELS } from '../domain/types'
import { Card, ChipGroup, FieldLabel, Notice, ScreenTitle } from '../ui/primitives'
import { Screen } from '../ui/shell'

const WINDOW = 28
const W = 320
const H = 150
const PAD = 8

const INPUT_OPTIONS = (Object.keys(LAG_INPUT_LABELS) as LagInput[]).map((value) => ({
  value,
  label: LAG_INPUT_LABELS[value],
}))

/**
 * The only analysis screen. One input against symptom shifted forward 1 day.
 * No correlation coefficient and no causal claim: the user looks and decides.
 */
export function LagView() {
  const [input, setInput] = useState<LagInput>('exertion')
  const days = useLiveQuery(() => store.latestDays(), [])
  const episodes = useLiveQuery(() => store.latestEpisodes(), [])
  const medEvents = useLiveQuery(() => store.latestMedEvents(), [])

  if (!days || !episodes || !medEvents) return <Screen><ScreenTitle title="Lag" /></Screen>

  const sleepMinutes = new Map(days.map((d) => [d.date, sleepDurationMinutes(d.sleepStart, d.sleepEnd)]))
  const series = buildLagSeries(input, today(), WINDOW, days, episodes, sleepMinutes)

  const x = (i: number) => PAD + (i / (WINDOW - 1)) * (W - PAD * 2)
  const yInput = (value: number) => H - PAD - (value / series.inputMax) * (H - PAD * 2)
  const ySymptom = (value: number) => H - PAD - (value / 10) * (H - PAD * 2)

  const path = (values: (number | null)[], y: (v: number) => number) => {
    const segments: string[] = []
    let open = false
    values.forEach((value, i) => {
      if (value === null) {
        open = false
        return
      }
      segments.push(`${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(value).toFixed(1)}`)
      open = true
    })
    return segments.join(' ')
  }

  const medMarks = medEvents
    .map((event) => ({ event, index: series.points.findIndex((p) => p.date === event.date) }))
    .filter((m) => m.index >= 0)

  const first = series.points[0]?.date
  const last = series.points[series.points.length - 1]?.date

  return (
    <Screen>
      <ScreenTitle
        title="Lag"
        subtitle={`${WINDOW} days. The input on a day against the symptom of the day after.`}
      />

      <Card>
        <FieldLabel>Input</FieldLabel>
        <ChipGroup options={INPUT_OPTIONS} value={input} onChange={setInput} columns={3} />
      </Card>

      <Card className="px-3">
        <FieldLabel hint={`${series.pairedDays} paired days`}>
          {LAG_INPUT_LABELS[input]} against next-day symptom
        </FieldLabel>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Lag comparison">
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#222836" />
          {medMarks.map(({ event, index }) => (
            <line
              key={`${event.date}-${event.drug}`}
              x1={x(index)}
              y1={PAD}
              x2={x(index)}
              y2={H - PAD}
              stroke="#e0a12a"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ))}
          <path d={path(series.points.map((p) => p.input), yInput)} fill="none" stroke="#5a8cff" strokeWidth={2} />
          <path
            d={path(series.points.map((p) => p.nextSymptom), ySymptom)}
            fill="none"
            stroke="#e0a12a"
            strokeWidth={2}
          />
          {series.points.map((p, i) =>
            p.nextSymptom === null ? null : (
              <circle key={p.date} cx={x(i)} cy={ySymptom(p.nextSymptom)} r={2.5} fill="#e0a12a" />
            ),
          )}
        </svg>
        <div className="mt-2 flex justify-between text-xs text-ink-400">
          <span>{first ? fromIsoDate(first).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
          <span>{last ? fromIsoDate(last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</span>
        </div>
        <div className="mt-3 flex gap-4 text-sm">
          <span className="flex items-center gap-2 text-ink-300">
            <span className="h-0.5 w-5 bg-brand-400" /> {LAG_INPUT_LABELS[input]}
          </span>
          <span className="flex items-center gap-2 text-ink-300">
            <span className="h-0.5 w-5 bg-warn-500" /> Symptom, next day
          </span>
        </div>
      </Card>

      {medMarks.length > 0 ? (
        <Notice>
          Dashed lines are medication events:{' '}
          {medMarks.map((m) => `${MED_EVENT_LABELS[m.event.type]} ${m.event.drug}`).join(', ')}.
        </Notice>
      ) : null}

      <p className="px-1 text-sm leading-relaxed text-ink-400">
        No coefficient is shown here and none is calculated. 2 lines that move together are not
        proof of anything. Look at the shape, then decide what to try.
      </p>
    </Screen>
  )
}

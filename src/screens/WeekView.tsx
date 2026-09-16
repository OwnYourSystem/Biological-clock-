import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../db/repo'
import { addDays, fromIsoDate, parseClock, shortWeekday, startOfWeek, today } from '../domain/dates'
import { isInRun } from '../domain/exertion'
import { buildWeek, type DayColumn, type WeekRollup } from '../domain/week'
import { LIGHT_STEPS, MED_EVENT_LABELS } from '../domain/types'
import type { LoadType } from '../domain/types'
import { Card, FieldLabel, Notice, ScreenTitle } from '../ui/primitives'
import { Screen } from '../ui/shell'

const COLS = 7
const COL_W = 50
const W = COLS * COL_W

const LOAD_COLOR: Record<LoadType, string> = {
  physical: '#5a8cff',
  sensory: '#3fa98a',
  social: '#e0a12a',
}

const INK_GRID = '#222836'
const INK_MUTED = '#5a6376'
const BRAND = '#2e6bff'

function colX(i: number): number {
  return i * COL_W + COL_W / 2
}

/**
 * Sleep as an actigraph. The x axis is clock time from 18:00 to 12:00, one
 * horizontal bar per day, a thin vertical tick at the midpoint. Read the
 * column of ticks top to bottom: straight means a stable clock, ragged means
 * drift. That is the entire point of this row.
 */
function SleepRow({ columns }: { columns: DayColumn[] }) {
  const AXIS_START = 18 * 60
  const SPAN = 18 * 60
  const ROW_H = 18
  const H = columns.length * ROW_H
  const LABEL_W = 34

  const x = (minutes: number) => {
    const offset = (minutes - AXIS_START + 1440) % 1440
    return LABEL_W + (offset / SPAN) * (W - LABEL_W)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" role="img" aria-label="Sleep across the week">
      {[18, 0, 6, 12].map((hour, i) => {
        const px = x(hour * 60)
        // The last tick sits on the right edge, so its label is anchored inward.
        const last = i === 3
        return (
          <g key={hour}>
            <line x1={px} y1={0} x2={px} y2={H} stroke={INK_GRID} strokeWidth={1} />
            <text
              x={px}
              y={H + 11}
              fill={INK_MUTED}
              fontSize={9}
              textAnchor={last ? 'end' : 'middle'}
            >
              {String(hour).padStart(2, '0')}
            </text>
          </g>
        )
      })}
      {columns.map((column, i) => {
        const y = i * ROW_H + ROW_H / 2
        const label = (
          <text key={`l${column.date}`} x={0} y={y + 3} fill={INK_MUTED} fontSize={9}>
            {shortWeekday(column.date)}
          </text>
        )
        if (!column.sleepStart || !column.sleepEnd) return label
        const x1 = x(parseClock(column.sleepStart))
        const x2raw = x(parseClock(column.sleepEnd))
        const x2 = x2raw <= x1 ? W : x2raw
        const mid = column.sleepMidpoint ? x(parseClock(column.sleepMidpoint)) : null
        return (
          <g key={column.date}>
            {label}
            <rect x={x1} y={y - 4} width={Math.max(2, x2 - x1)} height={8} rx={4} fill={BRAND} opacity={0.45} />
            {mid !== null ? <line x1={mid} y1={y - 8} x2={mid} y2={y + 8} stroke="#bed2ff" strokeWidth={2} /> : null}
          </g>
        )
      })}
    </svg>
  )
}

function LightRow({ columns }: { columns: DayColumn[] }) {
  const H = 44
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Morning light">
      <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke={INK_GRID} />
      {columns.map((column, i) => {
        const step = column.day?.lightMinutes ? LIGHT_STEPS[column.day.lightMinutes] : null
        if (step === null) return null
        const h = (step / 3) * (H - 6)
        return (
          <rect
            key={column.date}
            x={colX(i) - 12}
            y={H - 1 - h}
            width={24}
            height={Math.max(2, h)}
            rx={3}
            fill={BRAND}
            opacity={step === 0 ? 0.25 : 0.4 + step * 0.2}
          />
        )
      })}
    </svg>
  )
}

function ExertionRow({ week, floor, ceiling }: { week: WeekRollup; floor: number | null; ceiling: number | null }) {
  const H = 76
  const y = (value: number) => H - 1 - (value / week.exertionMax) * (H - 8)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Exertion against floor and ceiling">
      {week.columns.map((_, i) =>
        isInRun(i, week.belowFloorRuns) ? (
          <rect key={`run${i}`} x={i * COL_W} y={0} width={COL_W} height={H} fill="#e0a12a" opacity={0.12} />
        ) : null,
      )}
      <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke={INK_GRID} />
      {floor !== null ? (
        <line x1={0} y1={y(floor)} x2={W} y2={y(floor)} stroke="#e0a12a" strokeWidth={1} strokeDasharray="4 3" />
      ) : null}
      {ceiling !== null ? (
        <line x1={0} y1={y(ceiling)} x2={W} y2={y(ceiling)} stroke="#e04f4f" strokeWidth={1} strokeDasharray="4 3" />
      ) : null}
      {week.columns.map((column, i) => {
        const value = column.day?.exertionMinutes
        if (value === null || value === undefined) return null
        const top = y(value)
        return (
          <rect
            key={column.date}
            x={colX(i) - 11}
            y={top}
            width={22}
            height={Math.max(2, H - 1 - top)}
            rx={3}
            fill={ceiling !== null && value > ceiling ? '#e04f4f' : BRAND}
          />
        )
      })}
    </svg>
  )
}

function HeatRow({ columns }: { columns: DayColumn[] }) {
  const H = 34
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Heat flags">
      {columns.map((column, i) => {
        const flag = column.day?.heatFlag
        if (!flag || flag === 'none') return null
        return (
          <g key={column.date}>
            <circle cx={colX(i)} cy={13} r={7} fill="#e04f4f" opacity={0.85} />
            <text x={colX(i)} y={30} fill={INK_MUTED} fontSize={9} textAnchor="middle">
              {column.day?.heatMax !== null && column.day?.heatMax !== undefined ? `${column.day.heatMax}°` : flag}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Episode marks placed by time of day. Clustering is the pattern being sought. */
function EpisodeRow({ columns }: { columns: DayColumn[] }) {
  const H = 76
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Episodes by time of day">
      {[0, 6, 12, 18, 24].map((hour) => (
        <line key={hour} x1={0} y1={(hour / 24) * H} x2={W} y2={(hour / 24) * H} stroke={INK_GRID} strokeWidth={0.5} />
      ))}
      {columns.map((column, i) =>
        column.episodes.map((episode) => (
          <circle
            key={episode.id}
            cx={colX(i)}
            cy={(episode.minuteOfDay / 1440) * H}
            r={4.5}
            fill="#8fb1ff"
          />
        )),
      )}
      <text x={2} y={9} fill={INK_MUTED} fontSize={8}>00</text>
      <text x={2} y={H - 2} fill={INK_MUTED} fontSize={8}>24</text>
    </svg>
  )
}

/** Symptom line. 0 at top, so a line that sinks is a week that got worse. */
function SymptomRow({ columns }: { columns: DayColumn[] }) {
  const H = 76
  const y = (value: number) => 6 + (value / 10) * (H - 12)
  const points = columns
    .map((column, i) => ({ i, value: column.day?.symptom ?? null, load: column.day?.loadType ?? null }))
    .filter((p): p is { i: number; value: number; load: LoadType | null } => p.value !== null)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Symptom across the week">
      {[0, 5, 10].map((value) => (
        <line key={value} x1={0} y1={y(value)} x2={W} y2={y(value)} stroke={INK_GRID} strokeWidth={0.5} />
      ))}
      {points.length > 1 ? (
        <polyline
          points={points.map((p) => `${colX(p.i)},${y(p.value)}`).join(' ')}
          fill="none"
          stroke={BRAND}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ) : null}
      {points.map((p) => (
        <circle
          key={p.i}
          cx={colX(p.i)}
          cy={y(p.value)}
          r={5}
          fill={p.load ? LOAD_COLOR[p.load] : '#a8b0c0'}
          stroke="#07080b"
          strokeWidth={1.5}
        />
      ))}
      <text x={2} y={10} fill={INK_MUTED} fontSize={8}>0</text>
      <text x={2} y={H - 2} fill={INK_MUTED} fontSize={8}>10</text>
    </svg>
  )
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="px-3">
      <FieldLabel hint={hint}>{title}</FieldLabel>
      {children}
    </Card>
  )
}

export function WeekView() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today()))
  const days = useLiveQuery(() => store.latestDays(), [])
  const episodes = useLiveQuery(() => store.latestEpisodes(), [])
  const medEvents = useLiveQuery(() => store.latestMedEvents(), [])
  const settings = useLiveQuery(() => store.readSettings(), [])

  if (!days || !episodes || !medEvents || !settings) return <Screen><ScreenTitle title="Week" /></Screen>

  const week = buildWeek(weekStart, days, episodes, medEvents, settings)
  const weekEnd = addDays(weekStart, 6)
  const label = `${fromIsoDate(weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to ${fromIsoDate(weekEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
  const medsThisWeek = week.columns.flatMap((c) => c.medEvents.map((m) => ({ date: c.date, event: m })))

  return (
    <Screen>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
          className="min-h-12 rounded-2xl border border-ink-600 bg-ink-800 px-4 text-lg"
          aria-label="Previous week"
        >
          ‹
        </button>
        <ScreenTitle title={label} subtitle={`${week.loggedDays} of 7 days logged · ${week.episodeCount} episodes`} />
        <button
          type="button"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
          disabled={weekStart >= startOfWeek(today())}
          className="min-h-12 rounded-2xl border border-ink-600 bg-ink-800 px-4 text-lg disabled:opacity-30"
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 px-3 text-center text-xs text-ink-400">
        {week.columns.map((column) => (
          <span key={column.date}>{shortWeekday(column.date)}</span>
        ))}
      </div>

      <Row title="Sleep" hint="midpoint tick">
        <SleepRow columns={week.columns} />
      </Row>

      <Row title="Morning light">
        <LightRow columns={week.columns} />
      </Row>

      <Row
        title="Exertion"
        hint={
          settings.exertionFloorMinutes !== null
            ? `floor ${settings.exertionFloorMinutes} · ceiling ${settings.exertionCeilingMinutes}`
            : 'no clinician numbers yet'
        }
      >
        <ExertionRow week={week} floor={settings.exertionFloorMinutes} ceiling={settings.exertionCeilingMinutes} />
        {week.belowFloorRuns.length > 0 ? (
          <p className="mt-2 text-sm text-warn-500">
            {week.belowFloorRuns.length === 1 ? 'A run of' : 'Runs of'}{' '}
            {week.belowFloorRuns.map((r) => r.length).join(' and ')} days below the floor.
          </p>
        ) : null}
      </Row>

      <Row title="Heat">
        <HeatRow columns={week.columns} />
      </Row>

      <Row title="Episodes" hint="by time of day">
        <EpisodeRow columns={week.columns} />
      </Row>

      <Row title="Symptom" hint="dot colour is load type">
        <SymptomRow columns={week.columns} />
        <div className="mt-2 flex gap-4 text-xs text-ink-400">
          {(['physical', 'sensory', 'social'] as LoadType[]).map((load) => (
            <span key={load} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: LOAD_COLOR[load] }} />
              {load}
            </span>
          ))}
        </div>
      </Row>

      {medsThisWeek.length > 0 ? (
        <Notice>
          {medsThisWeek.map(({ date, event }) => (
            <span key={`${date}-${event.drug}-${event.type}`} className="block">
              {shortWeekday(date)}: {MED_EVENT_LABELS[event.type]} {event.drug}
            </span>
          ))}
        </Notice>
      ) : null}
    </Screen>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../db/repo'
import { humanTime } from '../domain/dates'
import { CONTEXT_LABELS, DURATION_LABELS } from '../domain/types'
import type { EpisodeContext, EpisodeDuration, EpisodeRecord } from '../domain/types'
import { Card, ChipGroup, FieldLabel, Notice, ScreenTitle } from '../ui/primitives'
import { Screen } from '../ui/shell'

const CONTEXT_OPTIONS = (Object.keys(CONTEXT_LABELS) as EpisodeContext[]).map((value) => ({
  value,
  label: CONTEXT_LABELS[value],
}))
const DURATION_OPTIONS = (Object.keys(DURATION_LABELS) as EpisodeDuration[]).map((value) => ({
  value,
  label: DURATION_LABELS[value],
}))

function dayLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Annotation card. Only ever shown for an episode that has already ended. */
function Annotate({ episode }: { episode: EpisodeRecord }) {
  return (
    <Card>
      <FieldLabel hint={dayLabel(episode.timestamp)}>{humanTime(episode.timestamp)}</FieldLabel>
      <p className="mb-2 text-sm text-ink-400">Where were you?</p>
      <ChipGroup
        options={CONTEXT_OPTIONS}
        value={episode.context}
        onChange={(context) => store.annotateEpisode(episode.id, { context, duration: episode.duration })}
      />
      <p className="mt-4 mb-2 text-sm text-ink-400">How long did it last?</p>
      <ChipGroup
        options={DURATION_OPTIONS}
        value={episode.duration}
        onChange={(duration) => store.annotateEpisode(episode.id, { context: episode.context, duration })}
        columns={3}
      />
    </Card>
  )
}

/**
 * One tap, offline, instant. The timestamp is written on the tap and is never
 * editable afterwards. Context and duration are asked for later, never during.
 */
export function EpisodeLog() {
  const episodes = useLiveQuery(() => store.latestEpisodes(), [])
  const [justLogged, setJustLogged] = useState<EpisodeRecord | null>(null)

  const log = async () => {
    const episode = await store.startEpisode()
    setJustLogged(episode)
    if ('vibrate' in navigator) navigator.vibrate(40)
  }

  const recent = (episodes ?? []).slice().reverse()
  const pending = recent.filter((e) => e.context === null || e.duration === null).slice(0, 5)
  const todayCount = recent.filter(
    (e) => new Date(e.timestamp).toDateString() === new Date().toDateString(),
  ).length

  return (
    <Screen>
      <ScreenTitle
        title="Episode"
        subtitle={todayCount === 0 ? 'None logged today.' : `${todayCount} logged today.`}
      />

      <button
        type="button"
        onClick={log}
        className="flex min-h-56 w-full flex-col items-center justify-center gap-2 rounded-card bg-brand-500 text-white transition active:scale-[0.98]"
      >
        <span className="text-3xl font-bold">Log it now</span>
        <span className="text-base text-brand-200">One tap. Works offline.</span>
      </button>

      {justLogged ? (
        <Notice>
          Logged at {humanTime(justLogged.timestamp)}. Put the phone down. Come back when it has
          passed and tell me the 2 details then.
        </Notice>
      ) : null}

      {pending.length > 0 ? (
        <>
          <h2 className="mt-2 px-1 text-sm font-semibold tracking-wide text-ink-300 uppercase">
            Waiting for details
          </h2>
          {pending.map((episode) => (
            <Annotate key={episode.id} episode={episode} />
          ))}
        </>
      ) : null}

      {recent.length > 0 ? (
        <Card tone="quiet">
          <FieldLabel>Recent</FieldLabel>
          <ul className="flex flex-col gap-2">
            {recent.slice(0, 12).map((episode) => (
              <li key={episode.id} className="flex items-baseline justify-between gap-3 text-base">
                <span className="tabular-nums text-ink-100">
                  {dayLabel(episode.timestamp)} · {humanTime(episode.timestamp)}
                </span>
                <span className="text-right text-sm text-ink-400">
                  {episode.context ? CONTEXT_LABELS[episode.context] : '—'}
                  {episode.duration ? ` · ${DURATION_LABELS[episode.duration]}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </Screen>
  )
}

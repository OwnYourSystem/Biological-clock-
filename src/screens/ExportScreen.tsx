import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../db/repo'
import { today } from '../domain/dates'
import { daysCsv, episodesCsv, labsCsv, medEventsCsv } from '../domain/csv'
import { createSnapshot, download } from '../backup/snapshot'
import { Card, FieldLabel, Notice, PrimaryButton, ScreenTitle } from '../ui/primitives'
import { Screen, type Route } from '../ui/shell'

export function ExportScreen({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const counts = useLiveQuery(async () => {
    const [days, episodes, labs, meds] = await Promise.all([
      store.allDays(),
      store.allEpisodes(),
      store.allLabs(),
      store.allMedEvents(),
    ])
    return { days: days.length, episodes: episodes.length, labs: labs.length, meds: meds.length }
  }, [])
  const [done, setDone] = useState<string | null>(null)

  const stamp = today()

  const exportCsv = async () => {
    const [days, episodes, labs, meds] = await Promise.all([
      store.allDays(),
      store.allEpisodes(),
      store.allLabs(),
      store.allMedEvents(),
    ])
    download(`health-log-days-${stamp}.csv`, daysCsv(days), 'text/csv')
    download(`health-log-episodes-${stamp}.csv`, episodesCsv(episodes), 'text/csv')
    if (labs.length) download(`health-log-labs-${stamp}.csv`, labsCsv(labs), 'text/csv')
    if (meds.length) download(`health-log-medications-${stamp}.csv`, medEventsCsv(meds), 'text/csv')
    setDone('CSV files saved.')
  }

  const exportJson = async () => {
    const snapshot = await createSnapshot()
    download(`health-log-snapshot-${stamp}.json`, JSON.stringify(snapshot, null, 2), 'application/json')
    setDone('Snapshot saved. Keep it somewhere you control.')
  }

  return (
    <Screen>
      <ScreenTitle title="Export" subtitle="Your data leaves in a format you can read." />

      {counts ? (
        <Card tone="quiet">
          <FieldLabel>On this device</FieldLabel>
          <ul className="flex flex-col gap-1 text-base text-ink-100 tabular-nums">
            <li>{counts.days} day rows, every version kept</li>
            <li>{counts.episodes} episode rows</li>
            <li>{counts.labs} lab rows</li>
            <li>{counts.meds} medication rows</li>
          </ul>
        </Card>
      ) : null}

      <PrimaryButton onClick={exportCsv}>Export CSV</PrimaryButton>
      <PrimaryButton tone="quiet" onClick={exportJson}>
        Export full snapshot, JSON
      </PrimaryButton>
      <PrimaryButton tone="quiet" onClick={() => onNavigate('report')}>
        Build a printable report
      </PrimaryButton>

      {done ? <Notice>{done}</Notice> : null}

      <p className="px-1 text-sm leading-relaxed text-ink-400">
        Exports carry every version of every row, not only the latest. If you corrected an entry,
        the original is still in the file. A clinician who asks whether something was edited gets
        an answer.
      </p>
    </Screen>
  )
}

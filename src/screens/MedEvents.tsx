import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../db/repo'
import { today } from '../domain/dates'
import { MED_EVENT_LABELS } from '../domain/types'
import type { MedEventType } from '../domain/types'
import {
  Card,
  ChipGroup,
  FieldLabel,
  Notice,
  PrimaryButton,
  ScreenTitle,
  TextInput,
} from '../ui/primitives'
import { Screen } from '../ui/shell'

const TYPE_OPTIONS = (Object.keys(MED_EVENT_LABELS) as MedEventType[]).map((value) => ({
  value,
  label: MED_EVENT_LABELS[value],
}))

/**
 * Medication events become vertical markers on the week and lag views.
 * Statin myalgia looks like muscle pain and would otherwise be read as an MS
 * symptom. The markers show whether the baseline moved after a change.
 */
export function MedEvents() {
  const events = useLiveQuery(() => store.latestMedEvents(), [])
  const [date, setDate] = useState(today())
  const [type, setType] = useState<MedEventType>('start')
  const [drug, setDrug] = useState('')
  const [note, setNote] = useState('')

  const save = async () => {
    if (!drug.trim()) return
    await store.saveMedEvent({ date, type, drug: drug.trim(), note: note.trim() })
    setDrug('')
    setNote('')
  }

  return (
    <Screen>
      <ScreenTitle title="Medication" subtitle="Only changes. This is not a dose diary." />

      <Notice>
        A statin can cause muscle pain that looks exactly like an MS symptom. Marking the change
        lets you see whether your baseline moved on the day it started.
      </Notice>

      <Card>
        <FieldLabel>Date</FieldLabel>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="min-h-14 w-full rounded-2xl border border-ink-600 bg-ink-800 px-4 text-lg tabular-nums"
        />
      </Card>

      <Card>
        <FieldLabel>What happened</FieldLabel>
        <ChipGroup options={TYPE_OPTIONS} value={type} onChange={setType} columns={3} />
      </Card>

      <Card>
        <FieldLabel>Drug</FieldLabel>
        <TextInput value={drug} onChange={setDrug} placeholder="Name" />
      </Card>

      <Card tone="quiet">
        <FieldLabel>Note</FieldLabel>
        <TextInput value={note} onChange={setNote} placeholder="Dose, reason, prescriber" />
      </Card>

      <PrimaryButton onClick={save} disabled={!drug.trim()}>
        Mark this change
      </PrimaryButton>

      {events && events.length > 0 ? (
        <Card tone="quiet">
          <FieldLabel>Marked so far</FieldLabel>
          <ul className="flex flex-col gap-2">
            {events.map((event) => (
              <li key={`${event.date}-${event.drug}-${event.type}-${event.version}`} className="text-base">
                <span className="tabular-nums text-ink-100">{event.date}</span>{' '}
                <span className="text-ink-300">
                  {MED_EVENT_LABELS[event.type]} {event.drug}
                </span>
                {event.note ? <div className="text-sm text-ink-400">{event.note}</div> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </Screen>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import { store } from '../db/repo'
import { humanDate, sleepDurationMinutes, sleepMidpoint, today } from '../domain/dates'
import { thresholdsReady } from '../domain/exertion'
import { HEAT_LABELS, LIGHT_LABELS, LOAD_LABELS } from '../domain/types'
import type { DayRecord, HeatFlag, IsoDate, LightBucket, LoadType, Settings } from '../domain/types'
import {
  Card,
  ChipGroup,
  FieldLabel,
  Notice,
  NumberInput,
  PrimaryButton,
  ScreenTitle,
  Slider,
  TextInput,
  TimeInput,
} from '../ui/primitives'
import { Screen } from '../ui/shell'

const LIGHT_OPTIONS = (Object.keys(LIGHT_LABELS) as LightBucket[]).map((value) => ({
  value,
  label: LIGHT_LABELS[value],
}))
const HEAT_OPTIONS = (Object.keys(HEAT_LABELS) as HeatFlag[]).map((value) => ({
  value,
  label: HEAT_LABELS[value],
}))
const LOAD_OPTIONS = (Object.keys(LOAD_LABELS) as LoadType[]).map((value) => ({
  value,
  label: LOAD_LABELS[value],
}))

/**
 * The evening entry. 5 inputs plus an optional note, in under 60 seconds on a
 * bad day. No score, no summary, no ring on this screen.
 *
 * The form mounts with the winning version already in its state, so there is
 * no load-then-overwrite step and no effect.
 */
function DailyLogForm({
  date,
  initial,
  settings,
  versionCount,
  onDone,
}: {
  date: IsoDate
  initial: DayRecord | null
  settings: Settings
  versionCount: number
  onDone: () => void
}) {
  const [sleepStart, setSleepStart] = useState(initial?.sleepStart ?? null)
  const [sleepEnd, setSleepEnd] = useState(initial?.sleepEnd ?? null)
  const [light, setLight] = useState<LightBucket | null>(initial?.lightMinutes ?? null)
  const [exertion, setExertion] = useState<number | null>(initial?.exertionMinutes ?? null)
  const [heatMax, setHeatMax] = useState<number | null>(initial?.heatMax ?? null)
  const [heatFlag, setHeatFlag] = useState<HeatFlag>(initial?.heatFlag ?? 'none')
  const [loadType, setLoadType] = useState<LoadType | null>(initial?.loadType ?? null)
  const [symptom, setSymptom] = useState(initial?.symptom ?? 0)
  const [note, setNote] = useState(initial?.note ?? '')
  const [orthostatic, setOrthostatic] = useState<number | null>(initial?.orthostaticDelta ?? null)
  const [saved, setSaved] = useState(false)

  const midpoint = sleepMidpoint(sleepStart, sleepEnd)
  const minutes = sleepDurationMinutes(sleepStart, sleepEnd)
  const exertionLocked = !thresholdsReady(settings)

  // Write first, validate second. An entry is never lost to a validation rule.
  const save = async () => {
    setSaved(true)
    await store.saveDay({
      date,
      sleepStart,
      sleepEnd,
      lightMinutes: light,
      exertionMinutes: exertion,
      heatMax,
      heatFlag,
      loadType,
      symptom,
      note: note.trim(),
      orthostaticDelta: settings.orthostaticEnabled ? orthostatic : null,
    })
    setTimeout(onDone, 450)
  }

  return (
    <Screen>
      <ScreenTitle
        title={humanDate(date)}
        subtitle={
          initial
            ? `Logged. Saving again writes version ${initial.version + 1} and keeps the old one.`
            : 'Six fields. Nothing else is asked of you.'
        }
      />

      <Card>
        <FieldLabel
          hint={midpoint ? `midpoint ${midpoint}${minutes ? ` · ${(minutes / 60).toFixed(1)} h` : ''}` : undefined}
        >
          Sleep
        </FieldLabel>
        <div className="flex gap-3">
          <TimeInput label="Asleep" value={sleepStart} onChange={setSleepStart} />
          <TimeInput label="Awake" value={sleepEnd} onChange={setSleepEnd} />
        </div>
      </Card>

      <Card>
        <FieldLabel>Morning light</FieldLabel>
        <ChipGroup options={LIGHT_OPTIONS} value={light} onChange={setLight} />
      </Card>

      <Card>
        <FieldLabel hint={settings.hrThresholdBpm ? `above ${settings.hrThresholdBpm} bpm` : undefined}>
          Exertion
        </FieldLabel>
        {exertionLocked ? (
          <Notice tone="warn">
            This field stays closed until your cardiologist gives you a heart rate threshold, a
            floor and a ceiling. Enter them in Settings. The app will not guess them.
          </Notice>
        ) : (
          <NumberInput value={exertion} onChange={setExertion} suffix="min" placeholder="0" />
        )}
      </Card>

      <Card>
        <FieldLabel>Heat</FieldLabel>
        <div className="mb-3">
          <NumberInput value={heatMax} onChange={setHeatMax} suffix="°C max" placeholder="20" />
        </div>
        <ChipGroup options={HEAT_OPTIONS} value={heatFlag} onChange={setHeatFlag} />
      </Card>

      <Card>
        <FieldLabel>Load today</FieldLabel>
        <ChipGroup options={LOAD_OPTIONS} value={loadType} onChange={setLoadType} columns={3} />
      </Card>

      <Card tone="accent">
        <FieldLabel hint={`${symptom} of 10`}>Symptom</FieldLabel>
        <Slider value={symptom} onChange={setSymptom} />
        <div className="mt-1 flex justify-between text-sm text-brand-200">
          <span>Nothing</span>
          <span>Worst</span>
        </div>
      </Card>

      {settings.orthostaticEnabled ? (
        <Card>
          <FieldLabel hint="lying to standing">Heart rate delta</FieldLabel>
          <NumberInput value={orthostatic} onChange={setOrthostatic} suffix="bpm" />
        </Card>
      ) : null}

      <Card tone="quiet">
        <FieldLabel>Note</FieldLabel>
        <TextInput value={note} onChange={setNote} placeholder="One line, if anything" />
      </Card>

      <PrimaryButton onClick={save}>{saved ? 'Saved' : 'Save the day'}</PrimaryButton>

      {versionCount > 1 ? (
        <p className="px-1 text-center text-sm text-ink-400">
          {versionCount} versions kept for today. Nothing was overwritten.
        </p>
      ) : null}
    </Screen>
  )
}

export function DailyLog({ onDone }: { onDone: () => void }) {
  const date = today()
  const loaded = useLiveQuery(async () => {
    const [day, settings, versionCount] = await Promise.all([
      store.dayFor(date),
      store.readSettings(),
      db.days.where('date').equals(date).count(),
    ])
    return { day, settings, versionCount }
  }, [date])

  if (!loaded) {
    return (
      <Screen>
        <ScreenTitle title={humanDate(date)} />
      </Screen>
    )
  }

  return (
    <DailyLogForm
      key={`${date}:${loaded.day?.version ?? 0}`}
      date={date}
      initial={loaded.day}
      settings={loaded.settings}
      versionCount={loaded.versionCount}
      onDone={onDone}
    />
  )
}

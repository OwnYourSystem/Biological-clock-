import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../db/repo'
import type { Settings } from '../domain/types'
import { thresholdsReady } from '../domain/exertion'
import { BACKUP_WARN_DAYS, daysSince } from '../backup/snapshot'
import { backupToDrive, isDriveConfigured } from '../backup/drive'
import {
  disableReminders,
  enableReminders,
  REMINDER_STATE_TEXT,
  reminderState,
  type ReminderState,
} from '../notify/reminders'
import {
  Card,
  FieldLabel,
  Notice,
  NumberInput,
  PrimaryButton,
  ScreenTitle,
  TimeInput,
} from '../ui/primitives'
import { Screen } from '../ui/shell'

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-ink-600 bg-ink-800 px-4 text-left text-base"
    >
      <span>{label}</span>
      <span
        className={`h-7 w-12 rounded-full p-1 transition ${checked ? 'bg-brand-500' : 'bg-ink-600'}`}
      >
        <span
          className={`block size-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  )
}

/** Mounted only once the stored settings are in hand, so the inputs start
 *  with the real values and no effect has to copy them in afterwards. */
function SettingsForm({ settings }: { settings: Settings }) {
  const [hr, setHr] = useState(settings.hrThresholdBpm)
  const [floor, setFloor] = useState(settings.exertionFloorMinutes)
  const [ceiling, setCeiling] = useState(settings.exertionCeilingMinutes)
  const [morning, setMorning] = useState(settings.reminderTimeMorning)
  const [evening, setEvening] = useState(settings.reminderTimeEvening)
  const [message, setMessage] = useState<string | null>(null)
  const [reminders, setReminders] = useState<ReminderState | null>(null)

  // Reading the permission and the sync registration is a query to the
  // browser, not to our own state, so it belongs in an effect.
  useEffect(() => {
    void reminderState().then(setReminders)
  }, [])

  const since = daysSince(settings.lastBackupAt)
  const ready = thresholdsReady(settings)

  const saveThresholds = async () => {
    await store.writeSettings({
      hrThresholdBpm: hr,
      exertionFloorMinutes: floor,
      exertionCeilingMinutes: ceiling,
    })
    setMessage('Saved.')
  }

  const runBackup = async () => {
    try {
      await backupToDrive({ interactive: true })
      setMessage('Backed up to Drive.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup failed.')
    }
  }

  return (
    <Screen>
      <ScreenTitle title="Settings" />

      <Card tone={ready ? 'default' : 'accent'}>
        <FieldLabel hint={ready ? 'set' : 'not set'}>Clinician numbers</FieldLabel>
        <p className="mb-3 text-sm leading-relaxed text-ink-300">
          Ask your cardiologist for these 3 numbers. The app does not derive, estimate or suggest
          them, and the exertion field stays closed until all 3 are here.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <span className="mb-1 block text-sm text-ink-400">Heart rate threshold</span>
            <NumberInput value={hr} onChange={setHr} suffix="bpm" />
          </div>
          <div>
            <span className="mb-1 block text-sm text-ink-400">Daily floor</span>
            <NumberInput value={floor} onChange={setFloor} suffix="min" />
          </div>
          <div>
            <span className="mb-1 block text-sm text-ink-400">Daily ceiling</span>
            <NumberInput value={ceiling} onChange={setCeiling} suffix="min" />
          </div>
          <PrimaryButton onClick={saveThresholds}>Save the numbers</PrimaryButton>
        </div>
      </Card>

      <Card>
        <FieldLabel hint={reminders === 'on' ? 'on' : 'off'}>Reminders</FieldLabel>
        <div className="mb-3">
          <Toggle
            label="Remind me if the day is unlogged"
            checked={reminders === 'on' || reminders === 'partial'}
            onChange={async (value) => {
              if (value) {
                setReminders(await enableReminders())
              } else {
                await disableReminders()
                setReminders('off')
              }
            }}
          />
        </div>
        {reminders ? (
          <p className="mb-3 text-sm leading-relaxed text-ink-400">{REMINDER_STATE_TEXT[reminders]}</p>
        ) : null}
        <div className="flex gap-3">
          <TimeInput
            label="Morning"
            value={morning}
            onChange={(value) => {
              setMorning(value)
              store.writeSettings({ reminderTimeMorning: value })
            }}
          />
          <TimeInput
            label="Evening"
            value={evening}
            onChange={(value) => {
              setEvening(value)
              store.writeSettings({ reminderTimeEvening: value })
            }}
          />
        </div>
      </Card>

      <Card>
        <FieldLabel>Orthostatic field</FieldLabel>
        <Toggle
          label="Show the lying to standing delta"
          checked={settings.orthostaticEnabled}
          onChange={(value) => store.writeSettings({ orthostaticEnabled: value })}
        />
        <p className="mt-2 text-sm leading-relaxed text-ink-400">
          Off by default. Turn it on only if a cardiologist asks for it.
        </p>
      </Card>

      <Card>
        <FieldLabel hint={since === null ? 'never' : `${since} days ago`}>Drive backup</FieldLabel>
        {!isDriveConfigured() ? (
          <Notice tone="warn">
            Not configured yet. Set VITE_GOOGLE_CLIENT_ID at build time and put the GCP project in
            Production publishing status. In Testing status the token expires after 7 days and
            backup stops silently.
          </Notice>
        ) : since !== null && since >= BACKUP_WARN_DAYS ? (
          <Notice tone="warn">
            {since} days since the last successful backup. Run one now.
          </Notice>
        ) : null}
        <div className="mt-3">
          <PrimaryButton tone="quiet" onClick={runBackup} disabled={!isDriveConfigured()}>
            Back up now
          </PrimaryButton>
        </div>
      </Card>

      {message ? <Notice>{message}</Notice> : null}

      <p className="px-1 text-sm leading-relaxed text-ink-400">
        This is a logging tool. It does not diagnose, advise or alert.
      </p>
    </Screen>
  )
}

export function SettingsScreen() {
  const settings = useLiveQuery(() => store.readSettings(), [])
  if (!settings) {
    return (
      <Screen>
        <ScreenTitle title="Settings" />
      </Screen>
    )
  }
  return <SettingsForm settings={settings} />
}

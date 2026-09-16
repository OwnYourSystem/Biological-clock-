import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { store } from '../db/repo'
import { today } from '../domain/dates'
import { Card, FieldLabel, NumberInput, PrimaryButton, ScreenTitle, TextInput } from '../ui/primitives'
import { Screen } from '../ui/shell'

/** Roughly 4 rows a year. It never appears on the week screen. */
export function Labs() {
  const labs = useLiveQuery(() => store.latestLabs(), [])
  const [date, setDate] = useState(today())
  const [total, setTotal] = useState<number | null>(null)
  const [ldl, setLdl] = useState<number | null>(null)
  const [hdl, setHdl] = useState<number | null>(null)
  const [trig, setTrig] = useState<number | null>(null)
  const [note, setNote] = useState('')

  const save = async () => {
    await store.saveLab({
      date,
      totalCholesterol: total,
      ldl,
      hdl,
      triglycerides: trig,
      note: note.trim(),
    })
    setTotal(null)
    setLdl(null)
    setHdl(null)
    setTrig(null)
    setNote('')
  }

  return (
    <Screen>
      <ScreenTitle title="Labs" subtitle="Quarterly. All values in mmol/L." />

      <Card>
        <FieldLabel>Date drawn</FieldLabel>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="min-h-14 w-full rounded-2xl border border-ink-600 bg-ink-800 px-4 text-lg tabular-nums"
        />
      </Card>

      <Card>
        <FieldLabel>Total cholesterol</FieldLabel>
        <NumberInput value={total} onChange={setTotal} step={0.1} suffix="mmol/L" />
      </Card>
      <Card>
        <FieldLabel>LDL</FieldLabel>
        <NumberInput value={ldl} onChange={setLdl} step={0.1} suffix="mmol/L" />
      </Card>
      <Card>
        <FieldLabel>HDL</FieldLabel>
        <NumberInput value={hdl} onChange={setHdl} step={0.1} suffix="mmol/L" />
      </Card>
      <Card>
        <FieldLabel>Triglycerides</FieldLabel>
        <NumberInput value={trig} onChange={setTrig} step={0.1} suffix="mmol/L" />
      </Card>
      <Card tone="quiet">
        <FieldLabel>Note</FieldLabel>
        <TextInput value={note} onChange={setNote} placeholder="Fasting, lab name, anything" />
      </Card>

      <PrimaryButton onClick={save}>Save this panel</PrimaryButton>

      {labs && labs.length > 0 ? (
        <Card tone="quiet">
          <FieldLabel>History</FieldLabel>
          <ul className="flex flex-col gap-3">
            {labs.map((lab) => (
              <li key={`${lab.date}-${lab.version}`} className="text-base">
                <div className="text-ink-100 tabular-nums">{lab.date}</div>
                <div className="text-sm text-ink-400 tabular-nums">
                  total {lab.totalCholesterol ?? '—'} · LDL {lab.ldl ?? '—'} · HDL {lab.hdl ?? '—'} · trig{' '}
                  {lab.triglycerides ?? '—'}
                </div>
                {lab.note ? <div className="text-sm text-ink-400">{lab.note}</div> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </Screen>
  )
}

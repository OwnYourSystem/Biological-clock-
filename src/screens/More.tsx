import { Card, ScreenTitle } from '../ui/primitives'
import { Screen, type Route } from '../ui/shell'

const ITEMS: { route: Route; title: string; detail: string }[] = [
  { route: 'labs', title: 'Labs', detail: 'Quarterly lipid panel' },
  { route: 'meds', title: 'Medication', detail: 'Start, stop, dose change' },
  { route: 'export', title: 'Export', detail: 'CSV, snapshot, printable report' },
  { route: 'settings', title: 'Settings', detail: 'Thresholds, reminders, backup' },
]

export function More({ onNavigate }: { onNavigate: (route: Route) => void }) {
  return (
    <Screen>
      <ScreenTitle title="More" />
      {ITEMS.map((item) => (
        <button key={item.route} type="button" onClick={() => onNavigate(item.route)} className="text-left">
          <Card className="transition active:scale-[0.99]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-ink-50">{item.title}</div>
                <div className="text-sm text-ink-400">{item.detail}</div>
              </div>
              <span className="text-2xl text-ink-500">›</span>
            </div>
          </Card>
        </button>
      ))}
    </Screen>
  )
}

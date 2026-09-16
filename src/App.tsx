import { useEffect } from 'react'
import { attemptDailyBackup } from './backup/drive'
import { refreshReminders } from './notify/reminders'
import { DailyLog } from './screens/DailyLog'
import { EpisodeLog } from './screens/EpisodeLog'
import { ExportScreen } from './screens/ExportScreen'
import { Labs } from './screens/Labs'
import { LagView } from './screens/LagView'
import { MedEvents } from './screens/MedEvents'
import { More } from './screens/More'
import { Report } from './screens/Report'
import { SettingsScreen } from './screens/Settings'
import { WeekView } from './screens/WeekView'
import { BottomBar } from './ui/shell'
import { useRoute } from './ui/useRoute'

/**
 * Health Log. A log, not a monitor. The default state is closed: nothing here
 * pulls you back in except the 2 reminders you set yourself.
 */
export default function App() {
  const [route, navigate] = useRoute()

  useEffect(() => {
    // Chrome will evict IndexedDB under storage pressure unless the origin is
    // marked persistent. Data is never lost is the second hard requirement.
    if (navigator.storage?.persist) void navigator.storage.persist()
    void attemptDailyBackup()
    // Chrome drops the periodic sync tag when it pleases, so re-register it.
    void refreshReminders()
  }, [])

  return (
    <div className="min-h-full bg-ink-950">
      {route === 'today' && <DailyLog onDone={() => navigate('week')} />}
      {route === 'episode' && <EpisodeLog />}
      {route === 'week' && <WeekView />}
      {route === 'lag' && <LagView />}
      {route === 'more' && <More onNavigate={navigate} />}
      {route === 'labs' && <Labs />}
      {route === 'meds' && <MedEvents />}
      {route === 'export' && <ExportScreen onNavigate={navigate} />}
      {route === 'report' && <Report />}
      {route === 'settings' && <SettingsScreen />}
      <BottomBar route={route} onNavigate={navigate} />
    </div>
  )
}

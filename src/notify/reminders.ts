/**
 * The 2 reminders, and nothing else.
 *
 * An honest note about what a PWA can actually do here. There is no reliable
 * alarm clock for a web app without a server. The Notification Triggers API
 * never shipped, and web push needs a push server this app deliberately does
 * not have.
 *
 * So the reminder rides Periodic Background Sync, which Chrome runs for an
 * installed PWA when it judges the moment suitable. It fires near the time,
 * not at the time, and only when the day is still unlogged. That is the
 * honest ceiling, and it is stated on the Settings screen rather than hidden.
 */
const REMINDER_TAG = 'health-log-reminder'
const MIN_INTERVAL_MS = 4 * 60 * 60 * 1000

export type ReminderState = 'unsupported' | 'blocked' | 'off' | 'partial' | 'on'

interface PeriodicSyncManager {
  register: (tag: string, options?: { minInterval: number }) => Promise<void>
  unregister: (tag: string) => Promise<void>
  getTags: () => Promise<string[]>
}

function periodicSync(registration: ServiceWorkerRegistration): PeriodicSyncManager | null {
  return 'periodicSync' in registration
    ? (registration as ServiceWorkerRegistration & { periodicSync: PeriodicSyncManager }).periodicSync
    : null
}

export function notificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export async function reminderState(): Promise<ReminderState> {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'off'

  const registration = await navigator.serviceWorker.ready
  const sync = periodicSync(registration)
  if (!sync) return 'partial'
  const tags = await sync.getTags()
  return tags.includes(REMINDER_TAG) ? 'on' : 'partial'
}

/** Asks once, then registers the background check. Never asks again by itself. */
export async function enableReminders(): Promise<ReminderState> {
  if (!notificationsSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'

  const registration = await navigator.serviceWorker.ready
  const sync = periodicSync(registration)
  if (!sync) return 'partial'

  try {
    await sync.register(REMINDER_TAG, { minInterval: MIN_INTERVAL_MS })
    return 'on'
  } catch {
    // Chrome refuses the registration until the app is installed and used.
    return 'partial'
  }
}

export async function disableReminders(): Promise<void> {
  if (!notificationsSupported()) return
  const registration = await navigator.serviceWorker.ready
  const sync = periodicSync(registration)
  if (!sync) return
  try {
    await sync.unregister(REMINDER_TAG)
  } catch {
    // Already gone.
  }
}

/** Re-registers on app open, because Chrome drops the tag when it pleases. */
export async function refreshReminders(): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const registration = await navigator.serviceWorker.ready
  const sync = periodicSync(registration)
  if (!sync) return
  try {
    const tags = await sync.getTags()
    if (!tags.includes(REMINDER_TAG)) await sync.register(REMINDER_TAG, { minInterval: MIN_INTERVAL_MS })
  } catch {
    // Nothing to do. Settings shows the real state.
  }
}

export const REMINDER_STATE_TEXT: Record<ReminderState, string> = {
  unsupported: 'This browser cannot show reminders. Nothing else is affected.',
  blocked: 'Notifications are blocked for this site. Change it in the browser site settings.',
  off: 'Off. No reminder will be shown.',
  partial:
    'Permission granted, but background checks are not running yet. Install the app to your home screen and open it a few times. Chrome enables them once it sees the app in regular use.',
  on: 'On. If the day is still unlogged after your evening time, one quiet reminder appears. A logged day is never interrupted.',
}

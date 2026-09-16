/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

const REMINDER_TAG = 'health-log-reminder'
const DB_NAME = 'health-log'
// Vite replaces this at build time with the deployment's base path.
const BASE = import.meta.env.BASE_URL

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${BASE}index.html`)))

self.addEventListener('install', () => {
  void self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function read<T>(db: IDBDatabase, storeName: string, query: IDBValidKey | IDBKeyRange): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([])
      return
    }
    const store = db.transaction(storeName, 'readonly').objectStore(storeName)
    const request = storeName === 'settings' ? store.get(query) : store.index('date').getAll(query)
    request.onsuccess = () => {
      const value = request.result
      resolve(value === undefined ? [] : Array.isArray(value) ? value : [value])
    }
    request.onerror = () => reject(request.error)
  })
}

function isoToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Fires at most one reminder, and only when the day is still unlogged and the
 * evening time has passed. A logged day is never interrupted. Nothing else in
 * this app notifies, ever.
 */
async function remindIfUnlogged(): Promise<void> {
  if (Notification.permission !== 'granted') return

  const db = await openDb()
  const date = isoToday()
  const [days, settings] = await Promise.all([
    read<{ date: string }>(db, 'days', date),
    read<{ reminderTimeEvening?: string; reminderTimeMorning?: string }>(db, 'settings', 1),
  ])
  db.close()

  if (days.length > 0) return

  const evening = settings[0]?.reminderTimeEvening ?? '21:00'
  const [hour, minute] = evening.split(':').map(Number)
  const now = new Date()
  if (now.getHours() * 60 + now.getMinutes() < hour * 60 + minute) return

  await self.registration.showNotification('Health Log', {
    body: 'Today is not logged yet. Six fields, under a minute.',
    tag: REMINDER_TAG,
    icon: `${BASE}icon-192.png`,
    badge: `${BASE}icon-192.png`,
    silent: true,
    data: { url: `${BASE}#/today` },
  })
}

self.addEventListener('periodicsync', (event) => {
  const sync = event as ExtendableEvent & { tag: string }
  if (sync.tag === REMINDER_TAG) sync.waitUntil(remindIfUnlogged())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? `${BASE}#/today`
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const open = windows[0]
      if (open) {
        await open.focus()
        return
      }
      await self.clients.openWindow(url)
    }),
  )
})

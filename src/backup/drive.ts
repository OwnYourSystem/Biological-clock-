import { SNAPSHOT_NAME, createSnapshot } from './snapshot'
import { store } from '../db/repo'

/**
 * Google Drive backup, scoped to `drive.file`, which reaches only the files
 * this app created. One JSON snapshot, overwritten daily when online.
 *
 * Nothing works until VITE_GOOGLE_CLIENT_ID is set and the GCP project is in
 * Production publishing status. In Testing status the refresh token expires
 * after 7 days and backup stops without saying so.
 */
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export function isDriveConfigured(): boolean {
  return typeof CLIENT_ID === 'string' && CLIENT_ID.length > 0
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void
  callback: (response: { access_token?: string; error?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => TokenClient
        }
      }
    }
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null

function loadGis(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load the Google sign-in script.'))
    document.head.appendChild(script)
  })
}

async function accessToken(interactive: boolean): Promise<string> {
  if (!CLIENT_ID) throw new Error('Drive backup is not configured yet.')
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  await loadGis()
  const oauth2 = window.google?.accounts.oauth2
  if (!oauth2) throw new Error('Google sign-in is unavailable.')

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'Sign-in was refused.'))
          return
        }
        cachedToken = { value: response.access_token, expiresAt: Date.now() + 50 * 60_000 }
        resolve(response.access_token)
      },
    })
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' })
  })
}

async function findSnapshotId(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${SNAPSHOT_NAME}' and trashed=false`)
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Drive refused the lookup (${response.status}).`)
  const body = (await response.json()) as { files?: { id: string }[] }
  return body.files?.[0]?.id ?? null
}

/** One snapshot, overwritten. Returns the time of the successful write. */
export async function backupToDrive({ interactive = false } = {}): Promise<number> {
  const token = await accessToken(interactive)
  const snapshot = await createSnapshot()
  const existingId = await findSnapshotId(token)

  const boundary = `hl${Date.now()}`
  const metadata = existingId ? {} : { name: SNAPSHOT_NAME, mimeType: 'application/json' }
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
    `${JSON.stringify(snapshot)}\r\n` +
    `--${boundary}--`

  const url = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

  const response = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!response.ok) throw new Error(`Drive refused the upload (${response.status}).`)

  const at = Date.now()
  await store.writeSettings({ lastBackupAt: at })
  return at
}

/**
 * Daily attempt, fired once per app open when online. Silent on failure: a
 * failed backup is surfaced in Settings as a stale lastBackupAt, not as a
 * popup. Nothing in this app interrupts the user except the 2 reminders.
 */
export async function attemptDailyBackup(): Promise<void> {
  if (!isDriveConfigured() || !navigator.onLine) return
  const settings = await store.readSettings()
  const last = settings.lastBackupAt ?? 0
  if (Date.now() - last < 20 * 3600_000) return
  try {
    await backupToDrive({ interactive: false })
  } catch {
    // Stays quiet. Settings shows how long it has been.
  }
}

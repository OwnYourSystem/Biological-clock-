// Manual smoke check. Not a test suite: it drives the built app in Chromium,
// seeds a month of plausible data and writes a screenshot per screen.
// Run: npm run build && npm run preview & npm run smoke
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = process.env.SMOKE_OUT ?? '.smoke'
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:4173'

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 })

const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(`${BASE}/#/today`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)

// Seed 28 days of plausible data straight into the stores Dexie already made.
await page.evaluate(async () => {
  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('health-log')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
  const put = (storeName, rows) =>
    new Promise((res, rej) => {
      const tx = db.transaction(storeName, 'readwrite')
      const os = tx.objectStore(storeName)
      rows.forEach((row) => os.put(row))
      tx.oncomplete = res
      tx.onerror = () => rej(tx.error)
    })

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const days = []
  const episodes = []
  const now = new Date()
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const drift = i % 7 < 2 ? 90 : 0
    const start = 22 * 60 + 30 + drift
    days.push({
      date: iso(d), version: 1,
      sleepStart: `${String(Math.floor(start / 60) % 24).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
      sleepEnd: i % 5 === 0 ? '08:10' : '07:05',
      lightMinutes: ['0', '10', '20', '30plus'][i % 4],
      exertionMinutes: i > 20 ? 8 : 18 + ((i * 7) % 40),
      heatMax: 17 + (i % 9),
      heatFlag: i % 9 === 0 ? 'bath' : i % 11 === 0 ? 'sun' : 'none',
      loadType: ['physical', 'sensory', 'social'][i % 3],
      symptom: 2 + ((i * 3) % 7),
      note: '', orthostaticDelta: null, createdAt: Date.now() - i * 86400000,
    })
    const count = i % 4 === 0 ? 2 : i % 3 === 0 ? 1 : 0
    for (let k = 0; k < count; k++) {
      const ts = new Date(d)
      ts.setHours(k === 0 ? 3 : 21, 15 + k * 7, 0, 0)
      episodes.push({
        id: `seed-${i}-${k}`, version: 1, timestamp: ts.getTime(),
        context: ['rest', 'sleep', 'standing'][(i + k) % 3],
        duration: ['under1', '1to10', 'over10'][(i + k) % 3],
        createdAt: ts.getTime(),
      })
    }
  }
  const medDate = new Date(now); medDate.setDate(medDate.getDate() - 9)
  await put('days', days)
  await put('episodes', episodes)
  await put('medEvents', [{ date: iso(medDate), version: 1, type: 'start', drug: 'Atorvastatin', note: '20 mg', createdAt: Date.now() }])
  await put('labs', [{ date: iso(new Date(now.getTime() - 40 * 86400000)), version: 1, totalCholesterol: 6.1, ldl: 4.0, hdl: 1.3, triglycerides: 1.7, note: 'Fasting', createdAt: Date.now() }])
  await put('settings', [{ id: 1, hrThresholdBpm: 112, exertionFloorMinutes: 20, exertionCeilingMinutes: 45, reminderTimeMorning: '08:00', reminderTimeEvening: '21:00', orthostaticEnabled: false, lastBackupAt: null }])
})

for (const route of ['today', 'week', 'lag', 'episode', 'more', 'settings', 'report']) {
  await page.goto(`${BASE}/#/${route}`, { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/${route}.png`, fullPage: true })
  console.log(`shot ${route}`)
}

console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors')
await browser.close()

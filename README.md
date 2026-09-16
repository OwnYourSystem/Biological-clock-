# Health Log

A private daily log for 3 chronic conditions: multiple sclerosis, cardiac
arrhythmia and hypercholesterolemia, plus neurodivergent sensory and social
load.

It is a log, not a monitor. The default state is closed. Continuous
self-scanning increases symptom focus, so it is an explicit anti-goal. There
is no readiness score, no streak, no badge, no live heart rate, and no
notification except the 2 quiet reminders you set yourself.

One person, one device. No server, no account, no sharing.

## The 3 things that must hold

1. The episode button works instantly and offline.
2. Data is never lost.
3. The daily entry completes in under 60 seconds on a bad day.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, Tailwind 4, installed as a PWA |
| Backend | None |
| Database | IndexedDB through Dexie |
| Backup | Google Drive, `drive.file` scope |
| Tests | Vitest, on the domain layer |

## Layout

```
src/
  domain/    pure functions, no I/O: dates, versions, week rollups, lag, CSV
  db/        Dexie schema and the one storage adapter
  backup/    snapshot builder and the Drive client
  ui/        component bricks, the shell and the router
  screens/   one file per screen
```

The 3 layers are screens, domain and storage. Nothing above N-Tier, because
there is 1 user on 1 device.

## Append-only

No record is ever updated in place. An edit writes a new row with the next
version for the same natural key, and readers take the highest version. The
old rows stay on disk and go out with the export.

A medical log that silently rewrites its own history is worthless to a
clinician. If you correct Tuesday's symptom number on Thursday, both numbers
survive and the export shows both.

This holds for episodes too. The tap writes the timestamp, and the timestamp
is never editable. The context and duration chips append version 2 and carry
the original timestamp forward.

## Thresholds come from a clinician

`hrThresholdBpm`, `exertionFloorMinutes` and `exertionCeilingMinutes` ship
empty. The app does not derive, estimate or suggest them, and the exertion
field stays closed until all 3 are entered in Settings.

With arrhythmia present, the cardiologist sets the exertion threshold first.

## Commands

```bash
npm install
npm run dev       # local development
npm test          # domain tests
npm run lint      # oxlint
npm run build     # typecheck, build, generate the service worker
npm run preview   # serve the production build
npm run icons     # regenerate the PWA icons from scripts/make-icons.mjs
npm run smoke     # manual screenshot pass over every screen, needs preview running
npm run audit     # dependency audit of what ships
```

## Drive backup

Backup is inert until you do 2 things:

1. Create an OAuth client ID in a GCP project and set `VITE_GOOGLE_CLIENT_ID`
   at build time. See `.env.example`.
2. Set the GCP project publishing status to **Production**. In Testing status
   the refresh token expires after 7 days and backup stops without telling you.

The scope is `drive.file`, which reaches only the files this app created. One
JSON snapshot, overwritten. Settings shows the last successful backup and warns
after 7 days.

Until that is configured, use Export to save a full JSON snapshot by hand.

## Install on Android

Open the deployed URL in Chrome and choose "Install app". Two entry points
appear: the app itself, and a shortcut straight to the episode screen through
`#/episode`. Long-press the icon to reach it.

The app asks for persistent storage on first run, so Chrome does not evict the
database under pressure.

## Medical note

This is a logging tool. It does not diagnose, advise or alert. Every threshold
in it was set by a clinician, not by this repository and not by the
application.

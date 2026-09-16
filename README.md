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
npm run audit     # dependency audit of what ships
```

Two scripts carry their own one-off dependency, so that neither CI nor a
deploy installs a browser or an image library it never uses:

```bash
npm i --no-save sharp && npm run icons       # regenerate the PWA icons
npm i --no-save playwright && npm run smoke  # screenshot every screen
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

## Deploying

A push to the default branch builds and publishes to GitHub Pages.

**One-time setup, and it needs a repository admin.** Open Settings, then
Pages, and set "Build and deployment" source to **GitHub Actions**. The
workflow tries to do this itself through `actions/configure-pages`, but the
token it runs with is refused: `Create Pages site failed. Resource not
accessible by integration`. Creating a Pages site needs admin rights that a
workflow token does not carry.

While Pages is off, the deploy workflow fails on every push and CI still
passes. That is the intended signal: a red deploy means the site is not live.
The moment the source is set, the same workflow succeeds with no change, and
the app is served at:

```
https://ownyoursystem.github.io/Biological-clock-/
```

If the deploy still fails after that, check Settings, then Actions, then
General, and set workflow permissions to "Read and write".

Pages serves from a subpath, so the build reads `VITE_BASE`. Everything that
needs the base path derives it from there: the asset URLs, the manifest scope
and start URL, the service worker navigation fallback, and the notification
icon. Deploying to a root domain instead needs no code change, only
`VITE_BASE=/`.

`vercel.json` and `netlify.toml` are in the repo for that case. Both expect
the root path, which is their default.

To preview a subpath build locally, pass the same value to both commands:

```bash
VITE_BASE=/Biological-clock-/ npm run build
VITE_BASE=/Biological-clock-/ npm run preview
```

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

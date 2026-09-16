# What I built, and why I built it that way

You handed me a locked specification and said go. Here's the whole thing
unpacked, in the order I actually thought about it.

---

## 1. Where I started, and why

I started at the data model, not at the screens.

The reason is in one line of your spec: "Append-only. Never update a record in
place." That sentence is not a storage preference. It decides the shape of
every query, every export, and half the UI copy in the app. If I had built the
daily entry screen first, I'd have written a normal form that loads a row and
saves it back. Then I'd have hit the append rule and rewritten it.

So the first file I wrote was `src/domain/types.ts`, the second was
`src/domain/version.ts`, and the third was the test for version resolution.
Only then did anything render.

Think of it like pouring a foundation. You can change a kitchen layout after
the house is up. You cannot move the foundation.

**The one place I extended your spec.** Your `episodes` table has an `id` but
no `version` column, while the append-only rule sits above it in the document.
Those two things conflict the moment the user taps the context chip, because
that is a write to an existing row. I added `version` to episodes and carried
the original timestamp forward on every new version. The timestamp is still
never editable, which was the real requirement. Flag it if you disagree and I
will collapse it back.

---

## 2. The roads I didn't take

**A backend.** Tempting, because it solves backup, sync and multi-device in
one move. Rejected because your spec says health data and no third-party
database, and because a server is a thing that can leak, expire, get billed,
or go down at 2am when you want to log an episode. No server means no attack
surface and no monthly cost. The price is that backup becomes your problem,
which is why Drive sits behind the storage adapter.

**A native Android app.** A real home screen widget would be genuinely better
for the episode button. One tap, no app launch, no browser. But it roughly
triples the build and adds a Play Store release process to every change. The
PWA shortcut plus the `#/episode` deep link gets you most of the way. Your own
spec said revisit only if the shortcut proves insufficient in real use, and I
agree with that ordering.

**localStorage instead of IndexedDB.** Simpler API, no schema. Rejected
because it is synchronous, size-capped around 5 MB, and stores strings only,
so every read would parse the whole database. IndexedDB with Dexie gives me
indexes, which is what makes "the highest version for this date" a cheap
lookup instead of a full scan.

**A charting library.** Recharts or Chart.js would have drawn the week view in
20 lines. I hand-wrote SVG instead, about 200 lines. Here's why: your sleep row
is not a chart any library ships. It is an actigraph, a 7-row raster with a
midpoint tick per row, read vertically for straightness. Bending a chart
library into that shape is more work than drawing it, and it would have added
100 kB to a bundle that has to load offline on a phone.

**A correlation coefficient on the lag view.** Your spec forbids it and you
were right to. With 28 noisy self-reported points, Pearson's r would produce a
number between -1 and 1 that looks like evidence and is not. The moment that
number exists, you start treating it as a verdict. Two lines and your own eyes
are more honest.

---

## 3. How the pieces connect

Three layers, and the rule is that arrows only point down.

```
screens/   know about React and about domain. Never touch Dexie.
domain/    pure functions. No I/O, no imports from db/ or ui/.
db/        one adapter. Everything that persists goes through it.
```

Why this matters in practice: `buildWeek()` takes records and returns 7
columns. It has no idea whether those records came from IndexedDB, a JSON
snapshot, or a test fixture. That's why 27 tests run in 380 ms with no browser
and no database. If the week rollup lived inside the React component, testing
it would need a rendered DOM and a mock database, and you would write 3 tests
instead of 27.

The storage adapter is the other hinge. `HealthStore` is an interface.
`createStore(db)` is one implementation. Drive backup reads through the same
adapter, which is what stops it becoming a second source of truth that
disagrees with the first.

Build order followed your spec exactly: schema, daily entry, episode button,
week view, export, backup, lag view, labs and medication. Each step is usable
before the next one starts.

---

## 4. Tools, and what each one bought

| Tool | What it bought | The alternative I passed on |
|---|---|---|
| Vite | 250 ms production builds, so I actually rebuild | Webpack, slower, more config |
| Dexie | Indexes and a typed table API over raw IndexedDB | Raw IndexedDB, about 80 lines of callback wrapping per table |
| Tailwind 4 | Style lives next to the markup it styles | A CSS file that drifts out of sync with the components |
| Vitest | Same config as Vite, no second toolchain | Jest, needs its own transform setup |
| vite-plugin-pwa | Service worker and manifest generated from config | Hand-written service worker, easy to get wrong, hard to debug |
| Playwright | I looked at every screen before telling you it works | Telling you it works because it compiled |

That last row is the one I'd underline. A build that passes `tsc` and a build
that renders are different claims. I seeded 28 days of plausible data into
IndexedDB, screenshotted all 7 screens, and found 2 real rendering bugs that no
test would have caught.

---

## 5. The tradeoffs, both sides

**Append-only costs storage and query complexity.** Every edit is a new row.
Every read does a resolution pass. In exchange, nothing is ever lost and a
clinician can see whether an entry was corrected. At your scale, under 1 MB a
year, the storage cost is free. At a million users it would not be.

**Hand-drawn SVG costs lines of code.** About 200 of them. In exchange the
week view looks exactly like your spec describes rather than like whatever the
library defaults to, and the bundle stays at 113 kB gzipped.

**No native app costs the true one-tap widget.** In exchange you get one
codebase, instant updates, and no store review.

**Hash routing looks dated.** `#/episode` instead of `/episode`. In exchange
the Android shortcut works from a cold start with no server rewrite rule, and
the app still works if it is ever opened from a file. For a single-user offline
app this is the right trade. For a public site it would not be.

**The exertion field is locked on day one.** That is deliberate friction. You
will open the app, see a closed field, and be mildly annoyed. That annoyance is
the feature. It is the app refusing to invent a number that belongs to your
cardiologist.

---

## 6. The mess

**The skill you pointed me at didn't exist.** `minimum-deliveries-ui/SKILL.md`
is not in this session. I searched the repo, the skills directory and the
plugins directory. I could have stopped and asked. You had said "we take care
of the missing parts later", so I used your own `me-style-app` conventions as
the nearest match and told you in the first line of my reply. If I had gone
quiet and waited, you would have lost an hour for nothing.

**ME style and the medical spec disagreed.** Your UI culture says visualize
progress with rings and bars. Your health spec bans scores, rings and streaks
outright, because they turn a log into a monitor. I took the spec. When two
sources of truth collide, the one closer to the actual harm wins, and the harm
here is symptom focus.

**Two setState-inside-useEffect warnings.** I first wrote both forms the lazy
way: render empty, then fill from the database in an effect. That causes a
double render and a visible flash. The fix was to split each screen into a
loader and a form, and mount the form only once the data is in hand, so
`useState` gets the real initial value. The effect disappeared entirely. When a
linter complains about an effect, the answer is usually to delete the effect,
not to silence the rule.

**The sleep axis clipped its own label.** The 12:00 tick sits exactly on the
right edge, and a centred text label got cut in half. Found it in a screenshot,
not a test. Fixed by anchoring that one label inward.

**The report table stretched across the page.** `w-full` on a 2 column table
threw the counts to the far right margin. Same story: only visible in a
picture.

---

## 7. What I wish someone had told me

**Decide your history model before you write a single form.** Append-only,
soft delete, or overwrite. Retrofitting append-only onto a finished CRUD app is
a rewrite, not a refactor.

**"No default value" is a real design decision, and it needs UI.** Shipping
`hrThreshold: null` is easy. The hard part is that every screen touching
exertion now has 2 states, and you have to design the empty one. Most apps
quietly ship a plausible default instead. That is how medical software starts
giving advice it has no business giving.

**Screenshot your UI before you claim it works.** Type checks prove your types
agree with each other. They prove nothing about whether a label fits inside its
box.

**A spec that says what is out of scope is worth more than one that says what
is in.** Your "no readiness score, no streaks, no badges" section shaped more
decisions than the feature list did. It is easy to write features. It is hard
to write down what you refuse to build, and that list is what stops scope
creep 6 months in.

**Request persistent storage on a PWA or Chrome will bin your database.** One
line, `navigator.storage.persist()`. Without it, IndexedDB is evictable under
storage pressure, and "data is never lost" quietly becomes false.

**Check the OAuth publishing status.** Your own spec caught this and it is the
kind of detail that eats a weekend. A GCP project in Testing status expires
refresh tokens after 7 days. Backup stops. Nothing errors. You find out when
you need the backup.

---

## 8. What an expert notices here

**The version resolution runs on read, not on write.** A beginner adds an
`isLatest` boolean column and flips it on every insert. That works until one
write fails halfway and now 2 rows claim to be latest, or none do. Deriving
the winner at read time means the data cannot contradict itself. There is no
state to get out of sync.

**`nextVersion()` uses the highest version seen, not the row count.** Those are
the same number right up until a row is deleted or an import merges 2 devices.
Then the count silently reuses a version number and you have 2 different rows
claiming to be version 3. Count is a coincidence. Max plus one is a rule.

**A missing day breaks a run.** In `runsBelowFloor`, a `null` day is not a low
day, it is an unknown day, and it ends the run. A beginner treats null as zero.
That would flag every holiday you forgot to log as a 3 day collapse, and you
would stop trusting the highlight within a fortnight. The credibility of a
warning is destroyed by its first false positive, not its tenth.

**The sleep row is transposed from the other 5.** Everything else is 7 columns.
Sleep is 7 stacked rows on a time axis, because "the straightness of the
midpoint line" only exists if the ticks stack vertically. The spec sentence
that reads like decoration is actually a layout instruction. Read specs for the
sentence that quietly constrains the geometry.

**The episode flow never asks a question during the event.** Tap writes a
timestamp and nothing else. The chips only appear afterwards, in a "waiting for
details" list. That is not a UI nicety. Asking someone to categorise their own
arrhythmia while it is happening produces bad data and real distress.

---

## 9. What carries over to your next project

**Find the sentence in the brief that constrains everything, and build from
there.** Here it was append-only. In a data pipeline it might be "the source
system is eventually consistent". In a report it might be "the board has 10
minutes". One sentence usually decides the architecture. Find it before you
start typing.

**Pure core, thin shell.** Push every decision into functions that take data
and return data. Keep I/O at the edges. This is why 27 tests run in under half
a second with no mocks. It works the same in Python, in SQL transformations, in
anything you build.

**Absence of a value is a state, not an error.** Null thresholds, unlogged
days, an unpaired final day in the lag window. Design the empty state on
purpose, or the code will invent one for you, and its invention will be zero.

**When two sources of truth disagree, name the collision out loud and pick by
consequence.** I told you in my first line that ME style and the medical spec
conflict on progress rings, and why the spec won. Silent resolution is how a
project drifts from what you asked for without anyone noticing.

**Look at the thing.** Compile, test, then open it and look. Two of the four
bugs in this build were invisible to every automated check I had.

---

## What's still missing

Not hidden, just not done:

1. **The 2 daily reminders.** The settings store the times. Nothing schedules a
   notification yet. Web push on Android needs a service worker notification
   permission flow, and it is worth doing carefully rather than quickly.
2. **The biometric prompt on app open.** Spec calls it optional. Not built.
3. **Drive backup is wired but inert.** It needs your client ID and a GCP
   project in Production status.
4. **The real UI skill.** Swap `minimum-deliveries-ui` in and I'll re-skin.

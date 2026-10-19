# web-player

The run of show: a Vite + React app that plays the evening's scenes from
`../src` in `@remotion/player`, full screen and letterboxed to 16:9, by the
clock. It reads one `event.json`, follows the agenda on its own, and lets the
host step forward or back with a clicker. The build is a static folder that
works from any path (`/present/` on the website, a USB stick), no server needed.

## Run it

Install (the scenes in `../` need their own install too; `make install` in
`../` does both). This package declares everything that ends up in `dist/`,
including what the scenes in `../src` import (`qrcode`, `zod`,
`@remotion/fonts`); `vite.config.ts` points those imports at this folder's
copies, so this folder's `npm audit` covers the whole build:

```bash
npm install
```

Dev server, then open http://127.0.0.1:4100/?event=2026-10-20-aws-meetup-vienna-53

```bash
npm run dev
```

Rehearse a moment of the evening, for example the end of the first talk at
ten times the speed:

```text
http://127.0.0.1:4100/?event=2026-10-20-aws-meetup-vienna-53&at=18:49&speed=10
```

Build into `dist/` (relative paths, so it can be copied anywhere):

```bash
npm run build
```

Unit tests and typecheck:

```bash
npm test
```

```bash
npm run typecheck
```

Build, serve `dist/` under `/present/` with `python3 -m http.server`, and check
it in headless Chrome at ten moments of the evening plus the clicker keys,
the help overlay, black, letterboxing and the error screens. PNGs land in
`out/check/`:

```bash
npm run check:screens
```

The same checks against the dev server:

```bash
node scripts/screenshots.mjs --dev
```

## Opening an event

| URL | Loads |
|---|---|
| `?event=2026-10-20-aws-meetup-vienna-53` | `./events/2026-10-20-aws-meetup-vienna-53.json`, next to the page |
| `?event=https://example.org/event.json` | that URL (it must allow cross-origin reads) |
| `?event=../data/event.json` | that path, relative to the page |

The file is validated with the same zod schema as the scenes and meetup-sync
(`../src/event.schema.ts`). A missing parameter, a missing file, a file that
is not JSON, or one that does not match the schema shows a readable error
screen with the address and each problem by path.

## What is on screen

| When | Scene |
|---|---|
| before doors open | `PreShow`, counting down to doors |
| a `networking` segment before the first talk | `PreShow`, counting down to the programme |
| `welcome` | `Welcome`, then `WhoWeAre`, `WhatWeDo`, `Members`, `GrowingTogether`, a minute each (those with data in `community`) |
| `sponsor` | `SponsorHandover` |
| a `talk`, first 90 s | `SpeakerHandover` |
| a `talk`, after that | `NowSpeaking` |
| `break` | `Break` |
| `closing` | `Closing` |
| from the event's `end` | `AfterEnd` |
| one press of next after a `break` or the `closing` | `Upcoming`, the next AWS Community Day (only when the event has one; never by the clock) |

In a gap between segments the previous scene holds. Each scene plays its
entrance once, then loops its hold (see `../src/scenes.ts`) for as long as it
is up. Countdowns read the player's clock through `LiveClockProvider`, updated
every 250 ms.

## Keys

| Key | Does |
|---|---|
| `→` `PgDn` `Space`, click | next scene |
| `←` `PgUp` | previous scene |
| `A` | back to the clock |
| `F` | fullscreen |
| `B` | black screen, and back |
| `+` | running late: the rest of the evening one minute later |
| `-` | one minute earlier |
| `0` | back to the times on the agenda |
| `?` | help: mode, simulated time, delay, current and next segment, links |
| click a chapter in the bottom bar | jump to that segment (manual mode; `A` goes back to the clock) |

Clickers send PgDn/PgUp. Stepping puts the player in manual mode. A step
ahead of the clock is released when the clock gets there (press next a
minute early and the evening carries on by itself from that scene); a step
back holds until `A`. The pointer hides after 2.5 s without movement.

## The countdown top right

Every scene but the after-end shows, where the AWS Community Austria logo
used to be, what the room waits for and how long: "Doors open in", "Talks
start in", the next part ("Break in", "Talk 2 in"), and during the closing
"Open until 22:00". It reads "1:05:00" (H:MM:SS) from an hour and a live
"MM:SS" below, the format of every countdown on the screens and in the
player's own lines; only days ahead of the evening "2 days 5 h". It follows the clock (the real one, or the
rehearsal clock of `?at=` and `?speed=`) against the published times: the
arrow keys, clicks and the `+` and `-` delay keys do not change it.

## Links for the host

Moving the mouse shows a small group of links top right for 3 s: the Meetup
event, the meetup's page on awscommunity.at (`/meetups/<id>/`), the feedback
link and the next community day's site. The help overlay lists them too.
They are the player's own chrome, never part of a scene, a still or a
render; clicking one opens a new tab and does not advance the show.

## The meetup page's header (`?embed=1`)

`/present/?event=<id>&embed=1` is the hero of each meetup page on
awscommunity.at, in an iframe (`Embed.tsx`, logic in `tour.ts`). Before doors
open and after the end it tours the evening's screens: the event card, the
agenda, the welcome's screens, the sponsor, the talks, one screen per coming
community day, "Our meetups" and "Our hosts and sponsors" (those two from
`events/archive.json`, written by `make player-event`; left out without it),
9 s each (the event card, or "Thank you for coming" after the end, 14 s).
During the evening it follows the clock like the room screen ("Live now").

- Screens crossfade; the scenes draw their chrome settled here, hold one view
  (the pre-show its event card) and play their entrance once.
- A thin line along the top fills for the screen on view, the dots (one per
  screen) jump there, the pill says what is next ("Next: Agenda · 6 s").
- The mouse on the header pauses it ("Paused"); leaving goes on.
- A click on the stage or a bar chapter shows that screen for 20 s ("Back to
  the tour in 15 s", a click on the pill goes back at once).
- Agenda rows, speakers, sponsors, community days, QR codes, groups, the team
  and the meetups are links: the website's pages in the top window (a hash
  opens that dialog on the meetup page), other sites in a new tab; a click on
  a link is never also a click on the stage.

Keys, `?at=` and `?speed=` have no effect there.

## Running late

Each `+` moves the rest of the evening one minute later, each `-` one minute
earlier (`=` and `_` work too, for keyboards where `+` needs Shift). A
segment that is under way keeps its start and ends later, every segment
still to come moves, finished segments stay as they were, and nothing moves
past the event's `end` (how long the venue lets us stay) or before the
moment of the press. Auto mode, the countdowns and "Back at" follow the moved
times. The help overlay shows the delay; nothing else on screen does. `0`
goes back to the agenda's times. The delay is kept in memory only: a reload
starts from the times in the event file again. The logic is
`src/delay.ts`, unit-tested in `src/delay.test.ts`.

If a scene throws, the stage shows a plain-text "This scene could not be
shown" screen in the error screen's style (not the Player's default, which
is an emoji); the keys keep working.

## Rehearsal

| Parameter | Does |
|---|---|
| `?at=18:49` or `?at=18:49:30` | starts the clock at that Vienna time on the event's date, then runs on |
| `?speed=10` | runs the clock ten times faster (up to 1000) |

Both are shown in the help overlay and nowhere else. A value that cannot be
read is ignored, and the help overlay says so.

## Layout

- `src/` the app and the pure run-of-show logic (see `src/README.md`)
- `public/events/` event files served next to the page
- `scripts/screenshots.mjs` the headless Chrome check
- `dist/` the build (not committed here; the website copies it)
- `out/` screenshots (not committed)

Fonts and logos are not copied into this folder: `vite.config.ts` serves
`../public` in dev and copies it into `dist/` on build, so the scenes, Studio
and the player share one set of files. Amazon Ember
(`../public/fonts/amazon-ember/`, gitignored) is served in dev only and never
copied into `dist/`: the built player asks for the installed font
(`local("Amazon Ember")`) and falls back to Inter, so the website never
serves the files. Install Amazon Ember on the room laptop.

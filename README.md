# meetup-stream-templates

The scenes of a meetup evening on screen, as Remotion compositions: the
pre-show loop while doors are open, welcome, the sponsor handover, each
speaker's handover, the quiet hold during a talk, the break with a countdown,
the closing with the feedback QR, and the thank-you after the end. Every scene
reads one `event.json` (see `../SPEC.md` and `src/event.schema.ts`).

## Part of the meetup tools

One of the repositories behind the AWS User Groups Austria meetup evenings, in
[aws-user-groups-austria](https://github.com/aws-user-groups-austria). Start with
[`meetup-workspace`](https://github.com/aws-user-groups-austria/meetup-workspace): it clones all of them (`make
clone`), installs them and runs the whole evening (`make start`); the contract
between them is its `SPEC.md`.

| Repository | What |
|---|---|
| [`meetup-workspace`](https://github.com/aws-user-groups-austria/meetup-workspace) | The Makefile, the spec and the guide |
| [`meetup-sync`](https://github.com/aws-user-groups-austria/meetup-sync) | A Meetup page to `event.json` |
| [`meetup-event-vienna`](https://github.com/aws-user-groups-austria/meetup-event-vienna) | One folder per meetup, shared photos and logos |
| **[`meetup-stream-templates`](https://github.com/aws-user-groups-austria/meetup-stream-templates)** | The room screen: Remotion scenes and the web player |
| [`meetup-deck`](https://github.com/aws-user-groups-austria/meetup-deck) | The slide deck, filled in |
| [`aws-community-austria-website`](https://github.com/aws-user-groups-austria/aws-community-austria-website) | awscommunity.at |


`web-player/` is the run of show: a Vite app that plays these scenes in
`@remotion/player` by the clock, with clicker keys and rehearsal parameters,
built to a static folder that works from any path. See `web-player/README.md`.

## Run it

Most commands below also have a `make` target; list them with:

```bash
make help
```

Install the scenes and the web player (Node 24):

```bash
make install
```

Or only the scenes:

```bash
npm install
```

Open Studio on the hand-written sample of the 20 October evening
(`examples/event.sample.json`; it differs from the generated event.json in
details such as the tagline, abstracts and links):

```bash
npm run studio
```

Render one PNG per scene of the real, synced event
(`../meetup-event-vienna/events/2026-10-20-aws-meetup-vienna-53/event.json`)
into `out/stills/`, per talk and per break for the talk and break scenes and
per panel for the pre-show. `out/stills/Agenda.png` is the still for the
slide deck:

```bash
make stills
```

Another synced event:

```bash
make stills EVENT=2026-10-20-aws-meetup-vienna-53
```

The hand-written sample into `out/stills-sample/`:

```bash
make stills-sample
```

Only when you want to check layouts: the stress case, fake test data with
made-up people and very long names (`examples/event.stress.json`), into
`out/stills-stress/` (never into `out/stills/`, never in the player):

```bash
make stills-stress
```

Any event file, into any folder:

```bash
node scripts/stills.mjs --event path/to/event.json --out out/stills-other
```

The stills use Amazon Ember when `public/fonts/amazon-ember/` is filled (it
is gitignored; the files are never committed or published) and Inter
otherwise:

```bash
make fonts
```

Unit tests and typecheck:

```bash
npm test
```

```bash
npm run typecheck
```

Dependency audit (expected: 0 vulnerabilities):

```bash
npm audit
```

## The web player

Dev server on http://127.0.0.1:4100/?event=2026-10-20-aws-meetup-vienna-53

```bash
make player
```

Build into `web-player/dist/`:

```bash
make player-build
```

Serve the build under `/present/` and check it in headless Chrome at simulated
times, with the clicker keys, into `web-player/out/check/`:

```bash
make player-check
```

Copy the synced event and its `assets/` folder from `../meetup-event-vienna`
into the player:

```bash
make player-event
```

Typecheck, unit tests (scenes and player) and the player build:

```bash
make check
```

## Scenes

| Composition | Shown during | Loop |
|---|---|---|
| `PreShow` | `networking` before the first talk, and before doors open | 120 s: equal panels (title and countdown, agenda, who we are, sponsor thanks, introducing our members, the next community day, good to know); each optional panel only when event.json has its data |
| `Welcome` | `welcome`, first minute | 2 s entrance, 60 s hold: "Welcome" beside the photo collage, then tonight's agenda |
| `WhoWeAre` | `welcome`, second minute | the team from `community.team` |
| `WhatWeDo` | `welcome`, third minute | the groups' logos from `community.groups` |
| `Members` | `welcome`, fourth minute | the badges from `community.badges` |
| `GrowingTogether` | `welcome`, fifth minute | the code of conduct from `community.codeOfConduct`, with a QR |
| `SponsorHandover` | `sponsor` | 2 s entrance, 60 s hold |
| `SpeakerHandover` | first 90 s of each `talk` | 2 s entrance, 60 s hold |
| `NowSpeaking` | rest of each `talk` | 2 s entrance, 60 s hold |
| `Break` | `break` | 2 s entrance, 60 s hold: the countdown, then the next community day (when there is one) |
| `Closing` | `closing` | 2 s entrance, 60 s hold |
| `AfterEnd` | after the event's `end` | 2 s entrance, 60 s hold |
| `Agenda` | a still for the slide deck | one frame |
| `Upcoming` | one key press after a break or the closing, never by the clock; only when `event.json` has `upcoming` | 2 s entrance, 60 s hold |

All are 1920x1080 at 30 fps and take `{ event: EventFile, segmentId?: string }`,
validated by `src/props.ts` (which wraps `eventSchema`). Without `segmentId` a
scene uses the first segment of its kind.

## One theme

`src/theme.ts` is the only place for fonts, the type scale (Display 136,
Title 96, Heading 68, Lead 56, Body 42, Small 34, Label 28), colours, the
grid (112 px margins, logos in the band from 72 to 192, the 96 px bottom bar
from y 984), spacing (8, 16, 24, 32, 48, 64, 96, 128; at least 64 between
content groups, 128 of the stage left empty, text at most 1504 wide), photo sizes (XL 360, L 280, M 200, team 160, S 96, 6 px ring), logo
heights (88 in the band, 48 in the bar, 160 on the sponsor screen) and the
layout tokens (`SPLIT_GAP` 96 between the columns of a two-column screen,
`TEAM` for the "Who we are" grid, `AGENDA` for the one agenda, `COLLAGE_W`
800 for the photo collage). The
scenes, the components and the web player's own screens use nothing else;
`src/theme.test.ts` fails on a literal font size, colour or spacing in
`src/scenes` or `src/components`, or a plate behind a logo. The values are the ones in `../SPEC.md`, "Theme: one
design for everything".

The welcome part steps through the group's intro pages from `community`
(a minute each, the arrow keys step through them too); a page without its
data is left out. The countdown top right (in place of the AWS Community
Austria logo) shows what the room waits for and how long, in the one
countdown format of the screens: "1:05:00" (H:MM:SS) from an hour, a live
"MM:SS" below (`formatCountdown` in `src/time.ts`); only days ahead of the
evening "2 days 5 h" (`src/countdown.ts`). The pre-show's and the break's
own countdowns use the same format. It follows the clock only, never the
presenter's keys or the delay keys.

Every screen carries one message, in at most three groups. Every scene but
Welcome and AfterEnd has the same bottom bar, after the GameDay talk deck's
phase bar: "Now" and the current part, a track of tonight's parts with the
fill and the user group's marker at the current time, and "hosted by" with
the host's logo from `event.json` (or the name, never another logo). Its
16 px labels and 26 px part name are the theme's one exception to the 28 px
minimum (`BAR` in `src/theme.ts`). In the web player every part on the
track is clickable and jumps to its start.

Every screen opens with the same head (`PageHead`: the accent eyebrow, the
title, an optional Lead subtitle) and is either centred (the sponsor, the
pre-show title, the community day, What we do, the members) or a deliberate
two-column screen with one strong visual on the right (the photo collage on
Welcome and AfterEnd, the team grid, the speakers' photos, a QR). There is
one agenda design (`AgendaPage` in `src/components/AgendaList.tsx`), used
by the Agenda still, the pre-show panel and the Welcome's second half.

## For the web player

- `src/scenes.ts`: `SCENES[id]` gives `component`, `durationInFrames`,
  `loopFrom` and `label`. Play from frame 0 once, then loop
  `[loopFrom, durationInFrames)`; the background is periodic over that range,
  so the loop has no seam.
- `sceneFor(segment, msIntoSegment)` returns the scene id for a moment inside a
  segment (talk: `SpeakerHandover` for the first 90 s, then `NowSpeaking`).
  `scenesInSegment(segment)` lists what manual stepping walks through.
- `src/clock.ts`: wrap the player in `LiveClockProvider value={{ nowMs, running }}`.
  Countdowns read it. Without it they show a static value (the full wait), so
  compositions stay pure functions of frame and props.
- `LiveClock` also carries `schedule` (the event before the +/- delay keys,
  for the countdown top right) and `goToSegment(id)`: the bottom bar's chapters call
  it when clicked. Only the web player provides it; in Studio and renders the
  chapters are plain text.
- `staticFile()` is used for logos and fonts; set `window.remotion_staticBase`
  to the player's own folder when it is served from a sub-path such as `/present/`.
  Image paths in `event.json` (speaker photos, sponsor logos) that are not full
  URLs also go through `staticFile()` (see `src/assets.ts`). For a synced
  event they are `events/<id>/assets/<file>`: `make player-event` and the
  website's `npm run present:sync` copy `meetup-event-vienna/events/<id>/assets/`
  there, and `scripts/stills.mjs` serves it the same way for stills.
  Images shared by every meetup are `people/`, `logos/`, `badges/` and
  `community/` paths, from the same folders in `meetup-event-vienna/`,
  served at the player's root next to `events/` (`make player-event` copies
  them; the stills serve them too).

## Rules this folder keeps

- `remotion` and every `@remotion/*` package pinned to exactly 4.0.530, React
  18.3.1 (4.0.531 and later break React 18 builds).
- No emoji on screen. Sizes, colours and fonts only from `src/theme.ts`;
  nothing smaller than Label (28 px).
- Amazon Ember files are never committed or published: `public/fonts/amazon-ember/`
  is gitignored and left out of the web player's build.
- A sponsor or host without a logo is shown by name, never with a look-alike
  logo. A speaker without a photo gets initials in a circle; with a photo in
  `event.json`, always the photo.
- QR codes are drawn locally from the `qrcode` package's module matrix into an
  inline SVG: no network, same output every render.
- No `Date.now()` or `fetch` in a composition.

## Layout

- `src/` the theme, the scenes, shared components, the registry
- `examples/` the hand-written sample for Studio, and fake stress-test data
- `public/` logos and fonts (Amazon Ember gitignored), served through `staticFile()`
- `scripts/` the stills renderer
- `out/` rendered stills (not committed): `stills/` the real event, `stills-sample/`, `stills-stress/`
- `web-player/` the run-of-show app
- `Makefile` install, studio, stills, stills-sample, stills-stress, player, player-build, player-check, player-event, test, typecheck, audit, check

# web-player/src

| File | What |
|---|---|
| `main.tsx` | Entry. Imports `staticBase.ts` first |
| `staticBase.ts` | Points Remotion's `staticFile()` at the folder the page is served from, so fonts and logos resolve under `/present/` |
| `App.tsx` | Loads the event, runs the clock, handles the keys and the bar's chapter clicks; the help overlay and the error screen |
| `chrome.ts` | The scenes' theme (`../../src/theme.ts`) scaled to the window, for the player's own screens |
| `links.tsx` | Links for the host's laptop (Meetup event, the meetup's page, feedback, the next community day): on mouse movement for 3 s, and in the help overlay |
| `Stage.tsx` | One scene in `@remotion/player`, letterboxed to 16:9, held by looping; a plain-text screen if a scene throws |
| `loop.ts` | Which frame of a scene to show while it is held: entrance once, then the hold loop |
| `runOfShow.ts` | Pure: for an event, a time and a manual offset, the scene, its segment, what is next and how long until then; the manual-only Upcoming steps; a jump to a segment |
| `delay.ts` | Pure: the `+` and `-` presses applied to the event, moving the segments still running or to come |
| `rehearsal.ts` | `?at=` and `?speed=`, Vienna local time to an instant, the simulated clock |
| `loadEvent.ts` | `?event=` to a URL, fetch, validate, readable errors; `loadArchive`: the optional `events/archive.json` (the meetup archive, embed only) |
| `Embed.tsx` | `?embed=1`, the meetup page's header: the tour (or the clock during the evening) with a crossfade between screens, the progress line, the dots, the pill, pause on hover; provides the embed context (links) and the archive to the scenes |
| `tour.ts` | Pure: the header's tour stops, its clock (advance, pause, a dot's jump), visits after a click, what the pill says |
| `*.test.ts`, `scenes.test.tsx` | Unit tests (vitest); `scenes.test.tsx` renders the scenes' markup for the real event (bar, chapters, logos, photos, the next community day, host logo or name) |

`runOfShow.test.ts` checks the real 20 October event at every agenda
boundary (16:59, 17:00, 17:59, 18:00, 18:05, 18:10, 18:11:29, 18:11:31,
18:50, 19:19, 19:20, 20:00, 21:59, 22:00) and manual next, previous and back
to the clock. `delay.test.ts` runs the same event late and early.

```bash
npm test
```

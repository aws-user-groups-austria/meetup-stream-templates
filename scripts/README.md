# scripts

`stills.mjs` bundles the project once and renders one PNG per composition:
per talk for `SpeakerHandover` and `NowSpeaking`, per break for `Break`
(and one of its community-day view), per panel for `PreShow`, the welcome
and its agenda view for `Welcome`, `Upcoming` only when the event has an
upcoming community day, frame 90 for the rest (past the entrances), frame 0
for the `Agenda` still. No live clock is provided, so countdowns show
their static value.

With `--event <file>` it renders that event into `out/stills/` (`make stills`
in `../` passes the synced 20 October event); without it, the hand-written
sample into `out/stills-sample/`:

```bash
npm run stills
```

When the event file sits next to an `assets/` folder
(`meetup-event-vienna/events/<id>/`), that folder is served as
`events/<id>/assets/` for the render, the path the web player uses. Photos
given as `people/<file>` come from the events repository's `people/` folder
(two folders up from the event file, or `--people <dir>`), served as
`people/`.

Options: `--event <file>`, `--out <dir>`, `--frame <n>`, `--scale <n>`,
`--only <Id,Id>`, `--people <dir>`. For example, the real agenda at 2x for slides:

```bash
node scripts/stills.mjs --event ../meetup-event-vienna/events/2026-10-20-aws-meetup-vienna-53/event.json --only Agenda --scale 2 --out out/stills-2x
```

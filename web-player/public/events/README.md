# web-player/public/events

`<id>.json` files, one per meetup, in the `event.json` format
(`../../../src/event.schema.ts`). `?event=<id>` loads `./events/<id>.json`.

`2026-10-20-aws-meetup-vienna-53.json` is meetup-sync's output for AWS Meetup
Vienna #53, copied from `meetup-event-vienna`. Refresh it after a sync, from
`meetup-stream-templates`:

```bash
make player-event EVENT=2026-10-20-aws-meetup-vienna-53
```

On the website, `npm run present:sync` copies the event files into
`public/present/events/` itself; this folder is for local runs and the checks.

`make player-event` also copies the event's `assets/` folder (speaker photos,
sponsor logos) to `<id>/assets/` here, where image paths like
`events/<id>/assets/darko.jpg` in the event file point. Those copies are
generated and ignored by git (`../../.gitignore`); the originals live in
`meetup-event-vienna/events/<id>/assets/`.

# web-player/public

Served at the root of the player, next to `index.html`, and copied into
`dist/` by the build (this README is left out of `dist/`).

- `events/` the event files `?event=<id>` loads
- `people/` photos shared by every meetup (`people/<file>` in an event file), copied from `meetup-event-vienna/people/` by `make player-event` in `../`; generated and ignored by git

Fonts and logos live in `../../public` and are shared with Studio and the
stills; see `../vite.config.ts`.

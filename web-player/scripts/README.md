# web-player/scripts

`screenshots.mjs` checks the built player in headless Chrome the way the
website serves it: `dist/` under `/present/` behind `python3 -m http.server`.
It opens the real event with `?at=` at 16:55, 17:30, 18:00:20, 18:02, 18:07, 18:10,
18:30, 18:55, 19:21, 20:30 and 22:05, presses PageDown, PageUp, A, the
arrows, Space, a click, `?` and B, steps to the next community day from the
break and the closing and waits for its pre-show panel, checks that the
countdown top right ticks and is unchanged after stepping and the delay keys,
clicks two chapters
in the bottom bar (and A back to the clock), checks that the host links show
on mouse movement and hide after 3 s, runs the clock at `?speed=10` across the
end of a talk handover, opens the help before doors open, runs the evening
five minutes late with `+` (and back with `-` and `0`), loads an event whose
closing scene throws (the plain-text fallback, no emoji), opens a 1600x1200
window for the letterbox, and loads a missing, an HTML and an invalid event
file. Each check compares the page's
`data-scene`, `data-segment` and `data-mode` with what is expected, and every
PNG goes into `out/check/`. Failed requests, exceptions and console errors
are reported. It starts its own server and Chrome on spare ports and stops
both when it ends.

```bash
npm run check:screens
```

Without building first:

```bash
node scripts/screenshots.mjs --no-build
```

Against the dev server, into `out/check-dev/`:

```bash
node scripts/screenshots.mjs --dev
```

Also hold one scene past its 62 s loop (adds a minute):

```bash
node scripts/screenshots.mjs --no-build --wrap
```

Set `CHROME` to the browser binary if Chrome is not in the usual place.

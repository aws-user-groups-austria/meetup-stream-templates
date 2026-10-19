# src

| File | What |
|---|---|
| `index.ts`, `Root.tsx` | Remotion entry and the Studio compositions, default props from `../examples/event.sample.json` |
| `event.schema.ts` | The `event.json` contract (zod). Shared with meetup-sync; change both together |
| `props.ts` | `sceneSchema`: `{ event, segmentId? }`, what every scene takes |
| `sample.ts` | The sample event, validated |
| `scenes.ts` | The registry for the web player: component, length, loop start, label per scene id |
| `sceneFor.ts` | Which scene a segment shows at a moment (the welcome's intro pages a minute each); pure, no React |
| `clock.ts` | `LiveClock` context: the player's `nowMs`, `running` and `goToSegment`; countdowns and the bar's chapters read it |
| `model.ts` | Read-only helpers over an event (segment lookup, sponsor and host names, chapters, upcoming community days, initials) |
| `time.ts` | Times and countdowns, always in Europe/Vienna; `formatCountdown` is the one countdown format (H:MM:SS, MM:SS) |
| `countdown.ts` | The countdown top right: its target and label for a moment, and its format (H:MM:SS from an hour, MM:SS below, days only days ahead) |
| `assets.ts` | Logo paths and how event image paths are resolved |
| `scenes/` | One file per composition |
| `components/` | Pieces the scenes share |
| `theme.ts` | The one theme: fonts, type scale, colours, the 112 px grid and the bottom bar, photo and logo sizes |
| `design/` | Fonts, entrance motion, text fitting |
| `*.test.ts(x)` | Unit tests, run with vitest |

Run the tests:

```bash
npm test
```

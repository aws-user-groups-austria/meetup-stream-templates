# examples

| File | What |
|---|---|
| `event.sample.json` | The 20 October 2026 evening (AWS Meetup Vienna #53), hand-written from the public Meetup page, without photos or logos (initials and names stand in). Studio's default props |
| `event.stress.json` | Fake test data, not a real event: made-up people ("Maximiliane Oberhuber-Leitgeb"), companies and venue with very long titles, names and sponsors, three speakers on one talk, a talk with none, two breaks, five speakers at a community day. Only for checking layouts; it is rendered only by `make stills-stress`, into `out/stills-stress/`, never into `out/stills/` or the web player |

Render the stress case, only when you want to check layouts:

```bash
make stills-stress
```

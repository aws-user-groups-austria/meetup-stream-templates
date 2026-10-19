# src/design

Helpers for the theme in `../theme.ts` (the one place for sizes, colours,
fonts, the grid, photo and logo sizes).

| File | What |
|---|---|
| `fonts.ts` | Registers Amazon Ember (installed font first, then the gitignored files in `public/fonts/amazon-ember/`) and Inter (the fallback, `public/fonts`); a render waits for both and never fails without Ember |
| `anim.ts` | Entrance and exit motion, and the two-view hold (Welcome, Break), as functions of the frame |
| `fit.ts` | Picks a type token for long text (Title, then Heading) from a deterministic wrap estimate |

Inter's latin-ext faces are registered with exactly the same weights as the
latin faces. A weight range there ("700 900") makes Chrome pick the ext face
for 900, which has no Latin glyphs, and every heavy title falls back to Arial.

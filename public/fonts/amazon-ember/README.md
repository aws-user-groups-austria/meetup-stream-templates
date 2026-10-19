# public/fonts/amazon-ember

Amazon Ember, the theme's font (`src/theme.ts`, `src/design/fonts.ts`).
Amazon Ember is free to use, but its files are never committed and never
published: everything in this folder except this README is gitignored, and
the web player's build leaves the folder out (`web-player/vite.config.ts`).

Fill it from the official Amazon Typefaces set before rendering stills or
running the player locally:

```bash
make fonts
```

It expects these four files:

- `amazon-ember-400.woff2` Regular
- `amazon-ember-500.ttf` Medium (the webfont set has no Medium)
- `amazon-ember-700.woff2` Bold
- `amazon-ember-800.woff2` Heavy

Without them the scenes ask for an installed Amazon Ember (`local()`), and
otherwise fall back to Inter (`../`), with one warning in the console.

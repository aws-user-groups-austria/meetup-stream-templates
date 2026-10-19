# public/fonts

- `amazon-ember/` Amazon Ember, the theme's font. Gitignored and never
  published; filled by `make fonts` (see the README there).
- `inter-*.woff2` Inter, the fallback, as woff2 files from `@fontsource/inter`
  (SIL Open Font License 1.1, fine to redistribute): latin 400 to 900,
  latin-ext 400 and 700 (used for 400 to 600 and 700 to 900; it carries
  characters such as the s-caron in "Mesaroš").

Both are registered in `src/design/fonts.ts`.

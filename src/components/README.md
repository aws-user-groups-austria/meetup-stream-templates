# src/components

Shared pieces of the scenes. Every size and colour comes from `../theme.ts`
(`../theme.test.ts` fails on a literal font size or colour here).

| File | What |
|---|---|
| `SceneFrame.tsx` | Background, the user group logo top left and the countdown top right in the top band, an optional header slot, the stage (content centred between the band and the bar), the bottom bar; loads the fonts |
| `BottomBar.tsx` | The bottom bar after the GameDay talk deck's phase bar: "Now" and the current part, the track (equal segments, rail, fill up to now, ticks, the user group's round marker), "hosted by" and the host logo; segments clickable in the web player through `goToSegment` |
| `Background.tsx` | Drifting glows and hexagon grid, periodic in the loop length |
| `Enter.tsx` | Fade-and-rise entrance from the frame; settled on a one-frame Still |
| `Eyebrow.tsx` | The accent overline above a title, one line (an ellipsis rather than past its column); centred with a bar on each side |
| `PageHead.tsx` | The head of every screen: eyebrow, title (the largest token at which it takes one line, else the first that fits), optional Lead subtitle; left or centred |
| `CollageSplit.tsx` | Welcome and AfterEnd: the text block left, the photo collage right (centred text without a collage) |
| `SponsorThanks.tsx` | The centred sponsor screen: eyebrow, "Thank you", the logo or name (two side by side, names in one shared token), an optional closing line |
| `TalkHero.tsx` | A talk on SpeakerHandover and NowSpeaking: XL photo beside the head for one speaker, L photos for two, M cards for more; one name token for all speakers |
| `AgendaList.tsx` | The one agenda: start time column, title (talks bold), speakers in Small under each talk, the current row on an accent band; Body, or Small when Body does not fit, then without speakers, then a window of rows. `AgendaPage` is the agenda screen around it (date and venue, "Tonight's agenda"), used by the Agenda still, the pre-show panel and the Welcome |
| `Speaker.tsx`, `Avatar.tsx` | A speaker without a card: the photo from event.json (initials only without one) at the theme's photo sizes (XL, L, M, team, S), name, role at company |
| `SponsorMark.tsx` | Sponsor logo from event.json, large, with no plate or card behind it; otherwise the name in type |
| `UpcomingBody.tsx` | A coming AWS Community Day (`index`, soonest first), the same everywhere: eyebrow and name across the top; its website's screenshot in a browser-like card (the url in the address bar, the QR code to the site on a white sticker over the corner); the day, the place and who speaks there beside it |
| `Linked.tsx` | A link on the meetup page's header only (the embed context): the website's pages in the top window, other sites in a new tab, never also a click on the stage; an accent ring, a tint and a lift on hover. Elsewhere it renders its children unchanged |
| `LogoPlate.tsx` | A host's logo on the light plate of the archive screens, in its colours for a light background (`plateLogo`); the name in type without one |
| `Qr.tsx`, `QrCard.tsx` | Local, deterministic QR code as inline SVG |
| `Countdown.tsx` | Countdown from the `LiveClock`, static fallback without it |
| `TopCountdown.tsx` | The countdown top right: label and value from `../countdown.ts`, against the published times |
| `Community.tsx` | The deck's community pages as pieces: TeamPage (the head left, a 3 x 2 grid of centred cards with the team photo size, a role "A · B" set as two lines), CentredPage, the group logos, the badges, the code of conduct with its QR |

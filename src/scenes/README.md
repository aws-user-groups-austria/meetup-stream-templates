# src/scenes

One React component per composition, each `React.FC<SceneProps>`. They read
the frame (entrances, the background, the two-view holds) and the props; a
countdown and the clickable chapters read the `LiveClock` context and
nothing else outside props. Sizes, colours, spacing and fonts only from
`../theme.ts`. One message per screen, at most three content groups, at
least 64 px between groups and 128 px of the stage left empty.

| File | Composition |
|---|---|
| `PreShow.tsx` | Pre-show loop: the title panel (centred: date, event, host, venue, the countdown band), the agenda (AgendaPage, the doors highlighted), who we are (TeamPage), the sponsor thanks (SponsorThanks), introducing our members, the next community day, good to know (text left, the event page QR right). Each optional panel only when there is data for it |
| `Welcome.tsx` | Two columns (CollageSplit): the date, "Welcome", the group, "Meetup #53" left, the photo collage right; the agenda (AgendaPage, the welcome highlighted) in the second half of the hold |
| `Intro.tsx` | The welcome's other intro pages: Who we are (TeamPage: the head left, a 3 x 2 grid of centred cards right), What we do and Introducing our members (centred head over one row), Growing together (text left, QR right) |
| `SponsorHandover.tsx` | Centred (SponsorThanks): the time, "Thank you", the logo or name, "Over to RBI" |
| `SpeakerHandover.tsx` | "Next up" and the time, the talk title, the speakers large (TalkHero: XL photo beside the head alone, L for two, M cards for more) |
| `NowSpeaking.tsx` | The same composition (TalkHero) with "Now speaking" |
| `Break.tsx` | Two columns: the break, "Back at 19:20" and the countdown left, the "Up next" card right; the next community day (UpcomingBody) in the second half of the hold |
| `Closing.tsx` | Two columns: "Thank you to our speakers" with their photos and "Networking until 22:00" left, the feedback QR right |
| `AfterEnd.tsx` | The Welcome's bookend (CollageSplit): "Thank you for coming", see you next time, the link, the collage right |
| `Agenda.tsx` | The agenda screen (AgendaPage) as a one-frame still |
| `Upcoming.tsx` | The next AWS Community Day on its own (UpcomingBody; a manual step in the web player) |
| `CommunityDay.tsx` | One coming community day per screen (`index`, UpcomingBody), for the meetup page's header tour |
| `OurMeetups.tsx` | "Our meetups": this evening and the three before it, four large cards (the host's logo on the light plate, the date, "Meetup #52"); from the meetup archive (`../archive.ts`), header tour only |
| `OurSponsors.tsx` | "Our hosts and sponsors": every past host once on the same light plates, 4 x 2, the meetup(s) each hosted under it; from the meetup archive, header tour only |

On the meetup page's header (the web player's embed mode, `../embed.ts`)
everything that has a page is a link (`../components/Linked.tsx`), the
pre-show holds its event card and Welcome and Break their first view; in
Studio, renders and on the room screen nothing changes.

Render them all to PNG to check the layout:

```bash
make stills
```

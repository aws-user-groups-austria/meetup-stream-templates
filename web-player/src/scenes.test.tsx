/**
 * The scenes' markup for the real 20 October event, rendered on the server
 * through the Player's Thumbnail (which provides the Remotion context the
 * scenes need): the next community day, and "hosted by" with the host's
 * logo or, without one, the host's name.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Thumbnail } from "@remotion/player";
import { eventSchema, type EventFile } from "../../src/event.schema";
import type { SceneProps } from "../../src/props";
import { LiveClockProvider } from "../../src/clock";
import { SCENE_IDS, SCENES, type SceneId } from "../../src/scenes";
import { preShowPanels } from "../../src/scenes/PreShow";
import { INTRO_FRAMES, LOOP_FRAMES, PRESHOW_FRAMES } from "../../src/theme";
import real from "../public/events/2026-10-20-aws-meetup-vienna-53.json";
import archiveRaw from "../../examples/archive.sample.json";
import { ArchiveProvider, archiveSchema, type Archive } from "../../src/archive";
import { EmbedProvider } from "../../src/embed";

const event: EventFile = eventSchema.parse(real);
const RBI_LOGO = "events/2026-10-20-aws-meetup-vienna-53/assets/rbi.svg";

const render = (id: SceneId, props: SceneProps, frame = 90, goToSegment?: (id: string) => void): string => {
  const scene = SCENES[id];
  return renderToStaticMarkup(
    <LiveClockProvider value={{ nowMs: null, running: false, goToSegment }}>
    <Thumbnail
      component={scene.component}
      inputProps={props}
      compositionWidth={1920}
      compositionHeight={1080}
      durationInFrames={scene.durationInFrames}
      fps={30}
      frameToDisplay={Math.min(frame, scene.durationInFrames - 1)}
    />
    </LiveClockProvider>,
  );
};

/** The text of the markup, tags dropped and entities decoded enough for these checks. */
const text = (html: string): string => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

const withoutUpcoming = (): EventFile => {
  const { upcoming: _drop, ...rest } = event;
  return rest as EventFile;
};

// React's development build warns about server rendering (useLayoutEffect) and about remotion
// 4.0.530 passing `ref` through AbsoluteFill; neither matters for markup checks.
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterAll(() => {
  vi.restoreAllMocks();
});

describe("Upcoming", () => {
  it("names the next community day, its day and place, who speaks there and a small QR, and nothing about the one after", () => {
    const html = render("Upcoming", { event });
    const t = text(html);
    expect(t).toContain("Next AWS Community Day");
    expect(t).toContain("AWS Community Day Adria");
    expect(t).toContain("Thursday, 22 October 2026");
    expect(t).toContain("Ljubljana, Slovenia");
    expect(t).toContain("Speaking there");
    expect(t).not.toContain("from our community");
    expect(html.match(/data-upcoming-speaker=/g)).toHaveLength(3);
    for (const name of ["Linda Mohamed", "Dmytro Hlotenko", "Darko Mesaroš"]) expect(t).toContain(name);
    for (const file of ["linda-mohamed.png", "dmytro-hlotenko.png", "darko-mesaros.png"]) expect(html).toContain(`data-photo="people/${file}"`);
    expect(t).not.toContain("After that");
    expect(t).not.toContain("Switzerland");
    expect(html).toMatch(/<svg[^>]*viewBox="0 0 \d+ \d+"[^>]*shape-rendering="crispEdges"/);
    expect(t).toContain("awscommunityadria.com");
  });

  it("keeps the closing to its three groups: no community-day line there", () => {
    const t = text(render("Closing", { event }));
    expect(t).toContain("Thank you");
    expect(t).toContain("Networking until 22:00");
    expect(t).not.toContain("See you at");
  });

  it("shows the website's screenshot, the QR code and the url wherever a community day appears", () => {
    const second = INTRO_FRAMES + LOOP_FRAMES / 2 + 90;
    const panels = preShowPanels(event);
    const frames = Math.floor(PRESHOW_FRAMES / panels.length);
    const screens = {
      Upcoming: render("Upcoming", { event }),
      Break: render("Break", { event, segmentId: "break-1" }, second),
      PreShow: render("PreShow", { event }, panels.indexOf("upcoming") * frames + 90),
      CommunityDay: render("CommunityDay", { event, index: 0 }),
    };
    for (const [id, html] of Object.entries(screens)) {
      expect(html, id).toContain('data-screenshot="community/communityday-adria.jpg"');
      expect(html, id).toContain('data-qr="https://awscommunityadria.com/"');
      expect(html, id).toMatch(/data-url=""[^>]*>awscommunityadria\.com</);
    }
  });

  it("is a PreShow panel and the Break's second view", () => {
    expect(preShowPanels(event)).toEqual(["title", "agenda", "team", "sponsor", "members", "upcoming", "notice"]);
    const upcomingPanel = preShowPanels(event).indexOf("upcoming");
    const panelFrames = Math.floor(PRESHOW_FRAMES / preShowPanels(event).length);
    expect(render("PreShow", { event }, upcomingPanel * panelFrames + 90)).toContain('data-upcoming="AWS Community Day Adria"');
    expect(render("Break", { event, segmentId: "break-1" })).not.toContain("data-upcoming=");
    const second = render("Break", { event, segmentId: "break-1" }, INTRO_FRAMES + LOOP_FRAMES / 2 + 90);
    expect(second).toContain('data-upcoming="AWS Community Day Adria"');
    expect(text(second)).toContain("Back at 19:20");
  });

  it("is left out everywhere when event.json has none", () => {
    const e = withoutUpcoming();
    expect(render("Upcoming", { event: e })).not.toContain("data-upcoming");
    expect(preShowPanels(e)).toEqual(["title", "agenda", "team", "sponsor", "members", "notice"]);
    expect(render("Break", { event: e, segmentId: "break-1" }, INTRO_FRAMES + LOOP_FRAMES / 2 + 90)).not.toContain("data-upcoming");
  });
});

describe("hosted by", () => {
  const hostedBy = (e: EventFile) => render("SpeakerHandover", { event: e, segmentId: "talk-1" });

  it("shows the host's logo from event.json, on the navy, and no name", () => {
    const html = hostedBy(event);
    expect(text(html)).toContain("hosted by");
    expect(html).toContain(`data-host-logo="${RBI_LOGO}"`);
    expect(html).not.toContain("data-host-name");
  });

  it("writes the host's name when there is no logo, and shows no image in its place", () => {
    const e: EventFile = { ...event, sponsors: event.sponsors.map(({ logo: _l, ...s }) => s) };
    const html = hostedBy(e);
    expect(html).not.toContain("data-host-logo");
    expect(html).toMatch(/data-host-name=""[^>]*>Raiffeisen Bank International</);
  });

  it("takes the name from the title when there is no sponsor, and says nothing when there is no host at all", () => {
    expect(hostedBy({ ...event, sponsors: [] })).toMatch(/data-host-name=""[^>]*>RBI</);
    const none = hostedBy({ ...event, sponsors: [], title: "AWS Meetup Vienna #53" });
    expect(text(none)).not.toContain("hosted by");
  });

  it("is on the PreShow and NowSpeaking cards too", () => {
    expect(render("PreShow", { event })).toContain("data-host-logo");
    expect(render("NowSpeaking", { event, segmentId: "talk-2" })).toContain("data-host-logo");
  });

  it("the sponsor handover shows the logo, or the name without one", () => {
    expect(render("SponsorHandover", { event })).toContain(`data-sponsor-logo="${RBI_LOGO}"`);
    const e: EventFile = { ...event, sponsors: event.sponsors.map(({ logo: _l, ...s }) => s), segments: event.segments.map(({ sponsor: _s, ...s }) => s) };
    const html = render("SponsorHandover", { event: e });
    expect(html).not.toContain("data-sponsor-logo");
    expect(html).toMatch(/data-sponsor-name=""[^>]*>Raiffeisen Bank International</);
  });
});

describe("one frame for every scene", () => {
  const props = (id: SceneId): SceneProps => {
    const kind = { SpeakerHandover: "talk-1", NowSpeaking: "talk-1", Break: "break-1" } as Partial<Record<SceneId, string>>;
    return kind[id] ? { event, segmentId: kind[id] } : { event };
  };

  it("has no deck triangle on any scene, the Welcome included", () => {
    for (const id of SCENE_IDS) expect(render(id, props(id)).includes("data-triangle"), id).toBe(false);
  });

  it("has one agenda design: the Agenda still, the pre-show panel and the Welcome's second view are the same AgendaPage", () => {
    const panels = preShowPanels(event);
    const frames = Math.floor(PRESHOW_FRAMES / panels.length);
    const screens = {
      Agenda: render("Agenda", { event }),
      PreShow: render("PreShow", { event }, panels.indexOf("agenda") * frames + 90),
      Welcome: render("Welcome", { event, segmentId: "welcome" }, INTRO_FRAMES + LOOP_FRAMES / 2 + 90),
    };
    for (const [id, html] of Object.entries(screens)) {
      expect(html, id).toContain("data-agenda-page=");
      expect(html.match(/data-agenda-row=/g), id).toHaveLength(event.segments.length);
      expect(text(html), id).toContain("Tonight's agenda");
      expect(text(html), id).toContain("Roman Jokel, Mladen Trampic");
    }
    expect(screens.Agenda).not.toContain("data-current");
    expect(screens.PreShow).toMatch(/data-agenda-row="doors" data-current=""/);
    expect(screens.Welcome).toMatch(/data-agenda-row="welcome" data-current=""/);
  });

  it("has the user group logo top left and the countdown top right on every scene but AfterEnd", () => {
    for (const id of SCENE_IDS) {
      const html = render(id, props(id));
      expect(html, id).toContain('data-logo="ug-vienna"');
      expect(html, id).not.toContain('data-logo="community-austria"');
      if (id !== "AfterEnd") expect(html, id).toContain("data-countdown-top=");
    }
  });

  it("has the bottom bar on every scene but Welcome and AfterEnd, with tonight's chapters", () => {
    for (const id of SCENE_IDS) expect(render(id, props(id)).includes("data-bar="), id).toBe(id !== "Welcome" && id !== "AfterEnd");
    const html = render("Break", props("Break"));
    expect(html.match(/data-chapter="/g)).toHaveLength(7);
    expect(html).toMatch(/data-chapter="break-1" data-current=""/);
    // The GameDay phase bar: "Now" and the part, the track, the host; no "Next" or "Open until" block.
    expect(text(html)).toMatch(/Now Break/);
    expect(text(html)).not.toMatch(/Open until|Next 19:20/);
    expect(html).toContain("data-marker");
    expect(html).toContain("data-fill");
    expect(html).toMatch(/hosted by/);
  });

  it("puts the marker in the middle of the current part in a still, and at the clock's time in the player", () => {
    const left = (html: string) => Number(/<img style="[^"]*left:([\d.]+)%[^"]*" data-marker=""/.exec(html)?.[1]);
    // Break is the fifth of seven parts: its middle is 4.5 / 7.
    expect(left(render("Break", props("Break")))).toBeCloseTo((4.5 / 7) * 100, 3);
    const at = Date.parse("2026-10-20T19:05:00+02:00");
    const live = renderToStaticMarkup(
      <LiveClockProvider value={{ nowMs: at, running: true }}>
        <Thumbnail component={SCENES.Break.component} inputProps={props("Break")} compositionWidth={1920} compositionHeight={1080} durationInFrames={SCENES.Break.durationInFrames} fps={30} frameToDisplay={90} />
      </LiveClockProvider>,
    );
    // 19:05 is half way through the 18:50-19:20 break.
    expect(left(live)).toBeCloseTo((4.5 / 7) * 100, 3);
    const later = renderToStaticMarkup(
      <LiveClockProvider value={{ nowMs: Date.parse("2026-10-20T19:14:00+02:00"), running: true }}>
        <Thumbnail component={SCENES.Break.component} inputProps={props("Break")} compositionWidth={1920} compositionHeight={1080} durationInFrames={SCENES.Break.durationInFrames} fps={30} frameToDisplay={90} />
      </LiveClockProvider>,
    );
    expect(left(later)).toBeCloseTo((4.8 / 7) * 100, 3);
  });

  it("makes the chapters clickable only when the player provides goToSegment", () => {
    expect(render("Break", props("Break"))).not.toMatch(/data-chapter="[^"]*"[^>]*cursor:pointer/);
    expect(render("Break", props("Break"), 90, () => undefined)).toMatch(/data-chapter="talk-2"[^>]*cursor:pointer/);
  });

  it("shows every speaker's photo from event.json, never initials instead", () => {
    const html = render("SpeakerHandover", props("SpeakerHandover"));
    expect(html).toContain('data-photo="events/2026-10-20-aws-meetup-vienna-53/assets/roman-jokel.png"');
    expect(html).toContain('data-photo="events/2026-10-20-aws-meetup-vienna-53/assets/mladen-trampic.png"');
    expect(text(html)).not.toMatch(/\bRJ\b|\bMT\b/);
  });
});

describe("one message per screen", () => {
  it("SpeakerHandover and NowSpeaking show no abstract", () => {
    for (const id of ["SpeakerHandover", "NowSpeaking"] as const) {
      for (const segmentId of ["talk-1", "talk-2"]) {
        const t = text(render(id, { event, segmentId }));
        expect(t, `${id} ${segmentId}`).not.toContain("About the talk");
        expect(t, `${id} ${segmentId}`).not.toContain("hallucinates");
        expect(t, `${id} ${segmentId}`).not.toContain("teammate for operations");
      }
    }
  });

  it("the pre-show has one QR on Good to know, a one-sentence photo notice, and no countdown pill in the header", () => {
    const panels = preShowPanels(event);
    const frames = Math.floor(PRESHOW_FRAMES / panels.length);
    const notice = render("PreShow", { event }, panels.indexOf("notice") * frames + 90);
    expect(notice.match(/data-qr=/g)).toHaveLength(1);
    expect(text(notice)).toContain("Photos and videos are taken tonight; tell an organizer if you prefer not to appear.");
    expect(text(notice)).not.toContain("retrospective");
    const agenda = render("PreShow", { event }, panels.indexOf("agenda") * frames + 90);
    expect(text(agenda)).not.toContain("Talks start at");
  });
});

describe("one line where it fits", () => {
  it("sets the Break card's next title on one line at Heading", () => {
    expect(render("Break", { event, segmentId: "break-1" })).toMatch(/data-next-title="heading"[^>]*white-space:nowrap/);
  });

  it("gives every upcoming speaker's name one line under the photo", () => {
    const html = render("Upcoming", { event });
    for (const name of ["Linda Mohamed", "Dmytro Hlotenko", "Darko Mesaroš"]) {
      expect(html).toMatch(new RegExp(`white-space:nowrap[^>]*>${name}<`));
    }
  });
});

describe("the intro pages", () => {
  const withoutCommunity = (): EventFile => {
    const { community: _c, ...rest } = event;
    return rest as EventFile;
  };

  it("Welcome has the deck's words and the photo collage", () => {
    const html = render("Welcome", { event, segmentId: "welcome" });
    expect(text(html)).toMatch(/Welcome to the AWS User Group Vienna Meetup #53/);
    expect(html).toContain('data-collage="community/meetup-photos.png"');
    expect(render("Welcome", { event: withoutCommunity(), segmentId: "welcome" })).not.toContain("data-collage");
  });

  it("Who we are shows the team with photos, and only the title without it", () => {
    const html = render("WhoWeAre", { event, segmentId: "welcome" });
    expect(html.match(/data-person=/g)).toHaveLength(6);
    expect(html).toContain('data-photo="people/philipp-bergsmann.png"');
    expect(text(html)).toContain("Quiz master AWS PubQuiz Austria");
    expect(html.match(/data-role=""/g)).toHaveLength(6);
    expect(html).toContain('data-avatar="team"');
    const bare = render("WhoWeAre", { event: withoutCommunity(), segmentId: "welcome" });
    expect(bare).not.toContain("data-person=");
    expect(text(bare)).toContain("Who we are");
  });

  it("What we do shows the three group logos, none without them", () => {
    const html = render("WhatWeDo", { event, segmentId: "welcome" });
    for (const f of ["logos/ug-vienna.png", "logos/wug-vienna.png", "logos/ug-linz.png"]) expect(html).toContain(`data-group-logo="${f}"`);
    expect(render("WhatWeDo", { event: withoutCommunity(), segmentId: "welcome" })).not.toContain("data-group-logo");
  });

  it("Members shows the five badges with the All-Timer, none without them", () => {
    const html = render("Members", { event, segmentId: "welcome" });
    expect(html.match(/data-badge=/g)).toHaveLength(5);
    expect(html).toContain('data-badge="All-Timer"');
    expect(text(html)).toContain("Welcome back! Say hi to the new faces.");
    expect(render("Members", { event: withoutCommunity(), segmentId: "welcome" })).not.toContain("data-badge=");
  });

  it("Growing together shows the code of conduct and its QR, the title alone without it", () => {
    const html = render("GrowingTogether", { event, segmentId: "welcome" });
    expect(text(html)).toContain("One Respectful Interaction at a Time");
    expect(text(html)).toContain("our organizers are here to navigate");
    expect(html).toContain(`data-qr="${event.community!.codeOfConduct!.url}"`);
    const bare = render("GrowingTogether", { event: withoutCommunity(), segmentId: "welcome" });
    expect(bare).not.toContain("data-qr=");
  });
});

describe("the countdown top right", () => {
  const live = (id: SceneId, props: SceneProps, nowIso: string, schedule?: EventFile) =>
    renderToStaticMarkup(
      <LiveClockProvider value={{ nowMs: Date.parse(nowIso), running: true, schedule }}>
        <Thumbnail component={SCENES[id].component} inputProps={props} compositionWidth={1920} compositionHeight={1080} durationInFrames={SCENES[id].durationInFrames} fps={30} frameToDisplay={90} />
      </LiveClockProvider>,
    );
  const value = (html: string) => /data-countdown-value=""[^>]*>([^<]*)</.exec(html)?.[1];
  const label = (html: string) => /data-countdown-top="([^"]*)"/.exec(html)?.[1];

  it("follows the clock, whatever scene the presenter stepped to", () => {
    const now = "2026-10-20T19:00:00+02:00";
    const onBreak = live("Break", { event, segmentId: "break-1" }, now);
    const steppedAhead = live("SpeakerHandover", { event, segmentId: "talk-2" }, now);
    const steppedBack = live("WhoWeAre", { event, segmentId: "welcome" }, now);
    for (const html of [onBreak, steppedAhead, steppedBack]) {
      expect(label(html)).toBe("Talk 2 in");
      expect(value(html)).toBe("20:00");
    }
  });

  it("counts to the published times, not the ones the +/- delay keys moved", () => {
    const shifted: EventFile = { ...event, segments: event.segments.map((s) => (s.id === "talk-2" ? { ...s, start: "2026-10-20T19:25:00+02:00" } : s)) };
    const html = live("Break", { event: shifted, segmentId: "break-1" }, "2026-10-20T19:00:00+02:00", event);
    expect(value(html)).toBe("20:00");
  });

  it("shows days and hours when the evening is days away, and a static value in a still", () => {
    expect(value(live("PreShow", { event }, "2026-10-18T12:00:00+02:00"))).toBe("2 days 5 h");
    expect(value(render("PreShow", { event }))).toBe("1:00:00");
    // The pre-show's own countdown uses the same format: H:MM:SS from an hour, MM:SS below.
    expect(/data-countdown=""[^>]*>([^<]*)</.exec(render("PreShow", { event }))?.[1]).toBe("1:00:00");
    expect(/data-countdown=""[^>]*>([^<]*)</.exec(render("Break", { event, segmentId: "break-1" }))?.[1]).toBe("30:00");
    expect(value(render("Break", { event, segmentId: "break-1" }))).toBe("30:00");
  });
});

// ---------------------------------------------------------------- the meetup page's header

const archive = archiveSchema.parse(archiveRaw);

/** A scene as the meetup page's header draws it: the embed context (links, one view) and the archive. */
const renderEmbed = (id: SceneId, props: SceneProps, frame = 90, withArchive: Archive | null = archive): string => {
  const scene = SCENES[id];
  return renderToStaticMarkup(
    <EmbedProvider value={{ site: "" }}>
      <ArchiveProvider value={withArchive}>
        <LiveClockProvider value={{ nowMs: null, running: false }}>
          <Thumbnail component={scene.component} inputProps={props} compositionWidth={1920} compositionHeight={1080} durationInFrames={scene.durationInFrames} fps={30} frameToDisplay={Math.min(frame, scene.durationInFrames - 1)} />
        </LiveClockProvider>
      </ArchiveProvider>
    </EmbedProvider>,
  );
};

/** Every link in the markup: [href, target]. */
const links = (html: string): [string, string][] =>
  [...html.matchAll(/<a [^>]*>/g)].map((m) => [/href="([^"]*)"/.exec(m[0])?.[1] ?? "", /target="([^"]*)"/.exec(m[0])?.[1] ?? ""]);

const PAGE = "/meetups/2026-10-20-aws-meetup-vienna-53/";
const sceneProps = (id: SceneId): SceneProps => {
  const seg = { SpeakerHandover: "talk-1", NowSpeaking: "talk-1", Break: "break-1", Closing: "closing" } as Partial<Record<SceneId, string>>;
  return seg[id] ? { event, segmentId: seg[id] } : { event };
};

describe("the meetup page's header: links", () => {
  it("has no link on any scene in Studio, a render or the room screen", () => {
    for (const id of SCENE_IDS) expect(render(id, sceneProps(id)), id).not.toContain("<a ");
  });

  it("opens each agenda row's dialog on the meetup page, in the top window", () => {
    const html = renderEmbed("Agenda", { event });
    const rows = links(html).filter(([href]) => href.includes("#agenda-"));
    expect(rows).toEqual(event.segments.map((s) => [`${PAGE}#agenda-${s.id}`, "_top"]));
  });

  it("opens a speaker's dialog from the photo and the name, and the talk's from its title", () => {
    const one = links(renderEmbed("SpeakerHandover", { event, segmentId: "talk-2" }));
    expect(one.filter(([h]) => h === `${PAGE}#speaker-darko-mesaros`)).toHaveLength(2);
    expect(one).toContainEqual([`${PAGE}#agenda-talk-2`, "_top"]);
    const two = links(renderEmbed("NowSpeaking", { event, segmentId: "talk-1" }));
    expect(two).toContainEqual([`${PAGE}#speaker-roman-jokel`, "_top"]);
    expect(two).toContainEqual([`${PAGE}#speaker-mladen-trampic`, "_top"]);
    const closing = links(renderEmbed("Closing", { event, segmentId: "closing" }));
    for (const slug of ["roman-jokel", "mladen-trampic", "darko-mesaros"]) expect(closing).toContainEqual([`${PAGE}#speaker-${slug}`, "_top"]);
  });

  it("opens the sponsor's site, the feedback and code of conduct QR codes, the groups and the team", () => {
    const sponsor = renderEmbed("SponsorHandover", { event, segmentId: "sponsor" });
    expect(links(sponsor)).toContainEqual(["https://www.rbinternational.com/de/raiffeisen.html", "_blank"]);
    expect(sponsor).toMatch(/<a [^>]*rel="noopener noreferrer"/);
    expect(links(renderEmbed("Closing", { event, segmentId: "closing" }))).toContainEqual([event.links.feedback, "_blank"]);
    expect(links(renderEmbed("GrowingTogether", { event }))).toContainEqual([event.community!.codeOfConduct!.url!, "_blank"]);
    const what = renderEmbed("WhatWeDo", { event });
    const groups = links(what);
    for (const g of event.community!.groups) {
      expect(groups).toContainEqual([g.url!, "_blank"]);
      // and the QR code to its Meetup page beside the logo, on the room screen as well
      expect(what).toContain(`data-qr="${g.url!}"`);
      expect(render("WhatWeDo", { event })).toContain(`data-qr="${g.url!}"`);
    }
    const team = links(renderEmbed("WhoWeAre", { event }));
    expect(team.filter(([h]) => h === "/team/")).toHaveLength(Math.min(6, event.community!.team.length));
    // the event card: the Meetup event, to RSVP
    expect(links(renderEmbed("PreShow", { event }))).toContainEqual([event.links.meetup, "_blank"]);
  });

  it("stops every link's click from also counting as a click on the stage (no inline handler leaks into the markup)", () => {
    // React attaches onClick (stopPropagation) without markup; the links carry their label for the tooltip.
    for (const m of renderEmbed("Agenda", { event }).matchAll(/<a [^>]*>/g)) expect(m[0]).toMatch(/title="[^"]+"/);
  });
});

describe("the meetup page's header: one view per screen", () => {
  it("the pre-show holds its event card: no agenda panel later in the loop", () => {
    const panels = preShowPanels(event);
    const frames = Math.floor(PRESHOW_FRAMES / panels.length);
    const later = renderEmbed("PreShow", { event }, panels.indexOf("agenda") * frames + 90);
    expect(later).not.toContain("data-agenda-page");
    expect(later).toContain("data-preshow-countdown");
  });

  it("the Welcome and the Break hold their first view", () => {
    const second = INTRO_FRAMES + LOOP_FRAMES / 2 + 90;
    expect(renderEmbed("Welcome", { event, segmentId: "welcome" }, second)).not.toContain('data-view="agenda"');
    expect(renderEmbed("Break", { event, segmentId: "break-1" }, second)).not.toContain('data-view="upcoming"');
  });

  it("draws the logo and the countdown settled, so the crossfade does not make them blink", () => {
    const html = renderEmbed("Agenda", { event }, 0);
    expect(html).toMatch(/<div style="position:absolute;top:88px;left:112px"><img[^>]*data-logo="ug-vienna"/);
  });
});

describe("the new tour screens", () => {
  it("A community day per screen: the screenshot, the QR and the url, the day, the place and the speakers, all linked", () => {
    const adria = renderEmbed("CommunityDay", { event, index: 0 });
    const t = text(adria);
    for (const s of ["Next AWS Community Day", "AWS Community Day Adria", "Thursday, 22 October 2026", "Ljubljana, Slovenia", "Speaking there", "Linda Mohamed", "Dmytro Hlotenko", "Darko Mesaroš"]) expect(t).toContain(s);
    for (const file of ["linda-mohamed.png", "dmytro-hlotenko.png", "darko-mesaros.png"]) expect(adria).toContain(`data-photo="people/${file}"`);
    expect(links(adria).filter(([h, tg]) => h === "https://awscommunityadria.com/" && tg === "_blank").length).toBeGreaterThanOrEqual(3);
    // Darko speaks tonight too: his photo opens his dialog; the others have none on this page
    expect(links(adria)).toContainEqual([`${PAGE}#speaker-darko-mesaros`, "_top"]);
    expect(links(adria)).not.toContainEqual([`${PAGE}#speaker-linda-mohamed`, "_top"]);
    const swiss = renderEmbed("CommunityDay", { event, index: 1 });
    expect(text(swiss)).toContain("Also coming up");
    expect(text(swiss)).toContain("AWS Community Day Switzerland");
    expect(swiss).toContain('data-screenshot="community/communityday-switzerland.jpg"');
    expect(swiss).toContain('data-qr="https://www.awsug.ch/"');
    expect(renderEmbed("CommunityDay", { event, index: 2 })).not.toContain("data-upcoming");
    // in a still: the same screen, no links
    expect(render("CommunityDay", { event, index: 0 })).not.toContain("<a ");
  });

  it("Our meetups: this evening marked, the three before it, each logo on the light plate, each a link to its page", () => {
    const html = renderEmbed("OurMeetups", { event });
    expect(html.match(/data-meetup="/g)).toHaveLength(4);
    expect(html).toMatch(/data-meetup="2026-10-20-aws-meetup-vienna-53" data-current=""/);
    const t = text(html);
    for (const s of ["Our meetups", "This evening", "Meetup #53", "Meetup #52", "Agentic Football Cup 2026", "Meetup #51", "28 Sep 2026"]) expect(t).toContain(s);
    expect(links(html)).toContainEqual(["/meetups/2026-09-28-aws-meetup-vienna-52/", "_top"]);
    expect(html).toContain('data-plate-logo="logos-light/eversports.svg"');
    // a logo, and no name repeated beside it; no venue posing as the host
    expect(html).not.toContain("data-plate-name");
    for (const venue of ["Generali Arena", "Enspired GmbH", "Eversport GmbH"]) expect(t).not.toContain(venue);
  });

  it("Our hosts and sponsors: each past host once, linked to its site or the meetup it hosted", () => {
    const html = renderEmbed("OurSponsors", { event });
    expect(html.match(/data-host="/g)).toHaveLength(8);
    expect(text(html)).toContain("3 meetups");
    const l = links(html);
    expect(l).toContainEqual(["https://bytesource.net/de/", "_blank"]);
    expect(l).toContainEqual(["/meetups/2025-04-15-aws-meetup-45/", "_top"]);
    expect(html).not.toContain('data-host="Raiffeisen Bank International"');
    expect(html.match(/data-plate-logo="logos-light\//g)).toHaveLength(8);
  });

  it("show only their head without the archive (and the tour leaves them out)", () => {
    expect(renderEmbed("OurMeetups", { event }, 90, null)).toContain('data-our-meetups="0"');
    expect(renderEmbed("OurSponsors", { event }, 90, null)).toContain('data-our-sponsors="0"');
  });
});

describe("the sponsor screen in the meetup page's header", () => {
  it("thanks the host without the room's handover line", () => {
    expect(render("SponsorHandover", { event, segmentId: "sponsor" })).toContain("Over to RBI");
    const header = renderEmbed("SponsorHandover", { event, segmentId: "sponsor" });
    expect(header).toContain("Thank you");
    expect(header).not.toContain("Over to");
  });
});

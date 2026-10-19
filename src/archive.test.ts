import { describe, expect, it } from "vitest";
import raw from "../examples/archive.sample.json";
import eventRaw from "../examples/event.sample.json";
import { archiveSchema, hostsBefore, meetupHeadline, meetupsAround, type Archive } from "./archive";
import { eventSchema } from "./event.schema";
import { agendaHref, meetupPage, personSlug, speakerHref, speaksTonight, urlHref } from "./embed";

const archive = archiveSchema.parse(raw);
const event = eventSchema.parse(eventRaw);

describe("the meetup archive", () => {
  it("is the sample scripts/archive-index.mjs writes: every meetup, newest first", () => {
    expect(archive.meetups.length).toBeGreaterThanOrEqual(10);
    const starts = archive.meetups.map((m) => Date.parse(m.start));
    expect([...starts].sort((a, b) => b - a)).toEqual(starts);
  });

  it("our meetups: this evening (marked), then the three before it, newest first", () => {
    const cards = meetupsAround(archive, event);
    expect(cards.map((c) => [meetupHeadline(c), c.when])).toEqual([
      ["Meetup #53", "current"],
      ["Meetup #52", "past"],
      ["Agentic Football Cup 2026", "past"],
      ["Meetup #51", "past"],
    ]);
  });

  it("our meetups seen from an older evening: the next one is there as up next", () => {
    const older = { id: "2026-09-28-aws-meetup-vienna-52", doorsOpen: "2026-09-28T17:00:00+02:00" };
    const cards = meetupsAround(archive, older);
    expect(cards[0]).toMatchObject({ id: "2026-10-20-aws-meetup-vienna-53", when: "next" });
    expect(cards[1]).toMatchObject({ id: older.id, when: "current" });
    expect(cards).toHaveLength(4);
  });

  it("our hosts and sponsors: each host before this evening once, ByteSource with its three meetups, each with its light-plate logo", () => {
    const hosts = hostsBefore(archive, event);
    expect(hosts.map((h) => h.name)).toEqual(["enspired", "DoIT", "Eversports", "ByteSource", "Raiffeisen Informatik", "Labyrinth Labs", "TU Wien", "SQUER"]);
    const bytesource = hosts.find((h) => h.name === "ByteSource")!;
    expect(bytesource.meetups.map((m) => m.id)).toEqual(["2026-04-22-aws-meetup-50", "2025-11-05-10-years-aws-user-group-vienna", "2025-05-07-aws-meetup-46-workshop"]);
    expect(bytesource).toMatchObject({ logo: "logos/bytesource.svg", plateLogo: "logos-light/bytesource.svg", url: "https://bytesource.net/de/" });
    // tonight's host is thanked on its own screen, not here
    expect(hosts.map((h) => h.name)).not.toContain("Raiffeisen Bank International");
    for (const h of hosts) expect(h.logo, h.name).toMatch(/^(logos\/|events\/[^/]+\/assets\/)/);
    for (const h of hosts) expect(h.plateLogo, h.name).toMatch(/^logos-light\/[a-z-]+\.(svg|png)$/);
  });

  it("dedupes a host by name in any case or legal form", () => {
    const m = (id: string, start: string, name: string) => ({ id, title: "t", start, venue: { name: "v" }, hosts: [{ name }], stream: false });
    const a: Archive = { version: 1, meetups: [m("2026-01-01-a", "2026-01-01T18:00:00+01:00", "Bytesource GmbH"), m("2025-01-01-b", "2025-01-01T18:00:00+01:00", "ByteSource")] };
    expect(hostsBefore(a, event).map((h) => [h.name, h.meetups.length])).toEqual([["Bytesource GmbH", 2]]);
  });

  it("is empty without an archive, so the tour leaves those screens out", () => {
    expect(meetupsAround(null, event)).toEqual([]);
    expect(hostsBefore(null, event)).toEqual([]);
  });
});

describe("links on the meetup page's header", () => {
  const embed = { site: "" };

  it("slugs a name the way the website's personSlug does", () => {
    expect(personSlug("Darko Mesaroš")).toBe("darko-mesaros");
    expect(personSlug("Roman Jokel")).toBe("roman-jokel");
    expect(personSlug("  Jörg  Müller-Lüdenscheidt ")).toBe("jorg-muller-ludenscheidt");
    expect(personSlug("Ana Đurić")).toBe("ana-uric");
  });

  it("opens the meetup page's dialogs in the top window, other sites in a new tab", () => {
    expect(agendaHref(embed, event, "talk-1")).toEqual({ href: "/meetups/2026-10-20-aws-meetup-vienna-53/#agenda-talk-1", target: "top" });
    expect(speakerHref(embed, event, "Darko Mesaroš")).toEqual({ href: "/meetups/2026-10-20-aws-meetup-vienna-53/#speaker-darko-mesaros", target: "top" });
    expect(meetupPage(embed, "2026-09-28-aws-meetup-vienna-52")).toEqual({ href: "/meetups/2026-09-28-aws-meetup-vienna-52/", target: "top" });
    expect(urlHref(embed, "https://awscommunityadria.com/")).toEqual({ href: "https://awscommunityadria.com/", target: "blank" });
    expect(urlHref(embed, "https://awscommunity.at/")).toEqual({ href: "/", target: "top" });
    expect(urlHref(embed, "https://www.awscommunity.at/team/")).toEqual({ href: "/team/", target: "top" });
  });

  it("knows who speaks tonight", () => {
    expect(speaksTonight(event, "Darko Mesaroš")).toBe(true);
    expect(speaksTonight(event, "Linda Mohamed")).toBe(false);
  });
});

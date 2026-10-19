/**
 * Read-only helpers over an EventFile, shared by the scenes and the player.
 * Nothing here invents a fact: a missing field gives undefined, and the scene
 * leaves that line out.
 */
import type { EventFile, Segment, Speaker, Upcoming } from "./event.schema";
import { localDay } from "./time";

export type Sponsor = EventFile["sponsors"][number];

/** The segment with this id, else the first one of `kind`. */
export const findSegment = (event: EventFile, segmentId: string | undefined, kind: Segment["kind"]): Segment | undefined =>
  (segmentId ? event.segments.find((s) => s.id === segmentId) : undefined) ?? event.segments.find((s) => s.kind === kind);

export const nextSegment = (event: EventFile, segment: Segment | undefined): Segment | undefined => {
  if (!segment) return undefined;
  const i = event.segments.findIndex((s) => s.id === segment.id);
  return i === -1 ? undefined : event.segments[i + 1];
};

export const talks = (event: EventFile): Segment[] => event.segments.filter((s) => s.kind === "talk");

/**
 * When the programme starts: the first segment that is not networking.
 * "Talks start at 18:00" on the pre-show.
 */
export const programmeStart = (event: EventFile): Segment | undefined =>
  event.segments.find((s) => s.kind !== "networking");

/** "AWS Meetup Vienna #53 - hosted by RBI" -> "AWS Meetup Vienna #53". */
export const shortTitle = (event: EventFile): string => event.title.split(/\s+[-\u2013\u2014]\s+/)[0] ?? event.title;

/** "hosted by RBI", the part after the dash, if any. */
export const titleSuffix = (event: EventFile): string | undefined => {
  const parts = event.title.split(/\s+[-\u2013\u2014]\s+/);
  return parts.length > 1 ? parts.slice(1).join(" - ") : undefined;
};

/** "Raiffeisen Bank International AG" -> "Raiffeisen Bank International". */
export const sponsorName = (s: { name: string }): string =>
  s.name.replace(/,?\s+(AG|GmbH|SE|Inc\.?|Ltd\.?|LLC|S\.A\.|B\.V\.)$/i, "").trim();

/** The short form for "over to RBI", else the display name. */
export const sponsorShort = (s: { name: string; short?: string }): string => s.short ?? sponsorName(s);

/** The sponsor a sponsor segment is about, else the first sponsor of the event. */
export const sponsorFor = (event: EventFile, segment: Segment | undefined): Sponsor | undefined => {
  if (segment?.sponsor) {
    const full = event.sponsors.find((s) => s.name === segment.sponsor!.name);
    return { ...full, ...segment.sponsor };
  }
  return event.sponsors[0];
};

/** "DM" for "Darko Mesaroš": first letters of the first and last word. */
export const initials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toLocaleUpperCase("de-AT");
};

/** "Cloud Architect, Raiffeisen Bank International" */
export const speakerLine = (s: Speaker): string => [s.role, s.company].filter(Boolean).join(", ");

/** What a segment is called on screen: the talk title for a talk. */
export const segmentLabel = (s: Segment): string => s.talk?.title ?? s.title;

export const speakerNames = (s: Segment): string => (s.talk?.speakers ?? []).map((p) => p.name).join(", ");

/** Host and path of a URL, for printing under a QR code: "awscommunity.at". */
export const prettyUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    return `${u.host.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
};

/** Sentences of a plain-text paragraph; a full stop inside "e.g. x" does not split. */
export const sentences = (text: string): string[] =>
  text
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(À-ſ])/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * The first `max` sentences of a text, and whether anything was left out.
 * For on-screen excerpts of the notices and abstracts; the full text stays
 * on the Meetup page.
 */
export const excerpt = (text: string, max: number): { text: string; cut: boolean } => {
  const all = sentences(text);
  return { text: all.slice(0, max).join(" "), cut: all.length > max };
};

/**
 * Where to find the next events: links.nextEvents, else the group's own
 * page (on the Meetup page of every event), so the closing never has an
 * empty line for it.
 */
export const nextEventsUrl = (event: EventFile): string => event.links.nextEvents ?? event.group.url;

/**
 * Who hosts the evening, for "hosted by" on the cards: the first sponsor
 * (the venue), else the name after "hosted by" in the title. A logo only
 * when event.json gives one for that sponsor; never one looked up by name.
 */
export const hostOf = (event: EventFile): { name: string; logo?: string } | undefined => {
  const s = event.sponsors[0];
  if (s) return s.logo ? { name: sponsorName(s), logo: s.logo } : { name: sponsorName(s) };
  const m = /^hosted by\s+(.+)$/i.exec(titleSuffix(event) ?? "");
  return m?.[1] ? { name: m[1].trim() } : undefined;
};

/** "Mooslackengasse 12, 1190 Wien, Austria" -> "Mooslackengasse 12, 1190 Wien": the country is a given at a local meetup. */
export const shortAddress = (address: string): string => address.replace(/,\s*(Austria|Österreich)\s*$/i, "").trim();

/** "#53" from "AWS Meetup Vienna #53", if the title has a number. */
export const meetupNumber = (event: EventFile): string | undefined => /#\d+/.exec(shortTitle(event))?.[0];

/**
 * The coming community days to announce: those on or after the evening's
 * day, soonest first. Empty when event.json has none, and every scene then
 * leaves the announcement out.
 */
export const upcomingFor = (event: EventFile): Upcoming[] => {
  const today = localDay(event.doorsOpen);
  return [...(event.upcoming ?? [])].filter((u) => (u.endDate ?? u.date) >= today).sort((a, b) => a.date.localeCompare(b.date));
};

/** A sponsor's short form for a speaker's company ("RBI"), else the company as given. */
export const companyLabel = (event: EventFile, company: string): string => {
  const s = event.sponsors.find((x) => x.name === company || sponsorName(x) === company);
  return s?.short ?? company;
};

/** "Cloud Architect at RBI", as on the Canva cards; just the role or the company when only one is known. */
export const roleAt = (event: EventFile, s: Speaker): string => {
  const company = s.company ? companyLabel(event, s.company) : undefined;
  return s.role && company ? `${s.role} at ${company}` : (s.role ?? company ?? "");
};

/**
 * Tonight's chapters for the bottom bar, one per segment, with short names:
 * Doors, Welcome, Sponsor, Talk 1, Break, Talk 2, Networking (a second break
 * is Break 2; networking after the talks is Networking).
 */
export const chapters = (event: EventFile): { id: string; label: string }[] => {
  const count: Partial<Record<Segment["kind"], number>> = {};
  const total = (kind: Segment["kind"]) => event.segments.filter((s) => s.kind === kind).length;
  return event.segments.map((s) => {
    const n = (count[s.kind] = (count[s.kind] ?? 0) + 1);
    const label =
      s.kind === "networking"
        ? "Doors"
        : s.kind === "welcome"
          ? "Welcome"
          : s.kind === "sponsor"
            ? total("sponsor") > 1 ? `Sponsor ${n}` : "Sponsor"
            : s.kind === "talk"
              ? `Talk ${n}`
              : s.kind === "break"
                ? total("break") > 1 ? `Break ${n}` : "Break"
                : "Networking";
    return { id: s.id, label };
  });
};

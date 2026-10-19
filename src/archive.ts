/**
 * The group's past meetups and their hosts, for the meetup page's header:
 * "Our meetups" and "Our hosts and sponsors". Not part of event.json (that
 * contract is shared with meetup-sync and is about one evening): the file is
 * events/archive.json, written by scripts/archive-index.mjs from every
 * meetup-event-vienna/events/<id>/meetup.json (and event.json for the logos).
 *
 * The web player loads it when it is there and puts it on ArchiveContext.
 * Without it (Studio without props, a render, a missing file) useArchive()
 * is null and the two screens are left out of the tour.
 */
import { createContext, useContext } from "react";
import { z } from "zod";
import type { EventFile } from "./event.schema";

const isoWithOffset = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/, "ISO 8601 with an offset");

export const archiveHostSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().optional(),
  /** A logo made for a dark screen: logos/<file> or events/<id>/assets/<file>. */
  logo: z.string().optional(),
  /** The same logo in its colours for a light background (logos-light/<file>), for the light plates of the header's archive screens. */
  plateLogo: z.string().optional(),
});

export const archiveMeetupSchema = z.object({
  id: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/),
  title: z.string().min(1),
  /** The meetup's number (#52); special evenings have none. */
  number: z.number().int().positive().optional(),
  start: isoWithOffset,
  venue: z.object({ name: z.string().min(1), address: z.string().optional() }),
  hosts: z.array(archiveHostSchema),
  /** Whether its page on the website has the live header. */
  stream: z.boolean(),
});

export const archiveSchema = z.object({
  version: z.literal(1),
  /** Newest first. */
  meetups: z.array(archiveMeetupSchema),
});

export type Archive = z.infer<typeof archiveSchema>;
export type ArchiveMeetup = z.infer<typeof archiveMeetupSchema>;
export type ArchiveHost = z.infer<typeof archiveHostSchema>;

const ArchiveContext = createContext<Archive | null>(null);
export const ArchiveProvider = ArchiveContext.Provider;
export const useArchive = (): Archive | null => useContext(ArchiveContext);

/** How many meetups "Our meetups" shows, in one row: this evening (or the next one) and the last ones before it. */
export const MEETUPS_SHOWN = 4;

export type MeetupCard = ArchiveMeetup & { when: "past" | "current" | "next" };

/**
 * "Our meetups": the meetups before this evening, the most recent first,
 * this evening, and the one after it when the archive already has it; at most
 * MEETUPS_SHOWN, newest first. This evening is in the list even when the
 * archive predates it.
 */
export const meetupsAround = (archive: Archive | null, event: Pick<EventFile, "id" | "doorsOpen">, max = MEETUPS_SHOWN): MeetupCard[] => {
  if (!archive) return [];
  const at = Date.parse(event.doorsOpen);
  const all = [...archive.meetups].sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  const current = all.find((m) => m.id === event.id);
  const after = all.filter((m) => m.id !== event.id && Date.parse(m.start) > at);
  const before = all.filter((m) => m.id !== event.id && Date.parse(m.start) <= at);
  const next = after.at(-1);
  const room = max - (current ? 1 : 0) - (next ? 1 : 0);
  return [
    ...(next ? [{ ...next, when: "next" as const }] : []),
    ...(current ? [{ ...current, when: "current" as const }] : []),
    ...before.slice(0, Math.max(0, room)).map((m) => ({ ...m, when: "past" as const })),
  ];
};

export type HostCard = { name: string; logo?: string; plateLogo?: string; url?: string; meetups: ArchiveMeetup[] };

const hostKey = (name: string): string =>
  name
    .replace(/,?\s+(AG|GmbH|SE|Inc\.?|Ltd\.?|LLC|S\.A\.|B\.V\.|s\.r\.o\.)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/**
 * "Our hosts and sponsors": every host of a meetup before this evening, once
 * (by name, any case or legal form, or by the same logo file), most recent
 * first, with the meetups each one hosted (newest first). A logo or url found
 * on any of their meetups is kept.
 */
export const hostsBefore = (archive: Archive | null, event: Pick<EventFile, "id" | "doorsOpen">): HostCard[] => {
  if (!archive) return [];
  const at = Date.parse(event.doorsOpen);
  const past = [...archive.meetups].filter((m) => m.id !== event.id && Date.parse(m.start) < at).sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  const cards: HostCard[] = [];
  for (const m of past) {
    for (const h of m.hosts) {
      const hit = cards.find((c) => hostKey(c.name) === hostKey(h.name) || (h.logo !== undefined && c.logo === h.logo));
      if (hit) {
        if (!hit.meetups.includes(m)) hit.meetups.push(m);
        hit.logo ??= h.logo;
        hit.plateLogo ??= h.plateLogo;
        hit.url ??= h.url;
      } else {
        cards.push({ name: h.name, ...(h.logo ? { logo: h.logo } : {}), ...(h.plateLogo ? { plateLogo: h.plateLogo } : {}), ...(h.url ? { url: h.url } : {}), meetups: [m] });
      }
    }
  }
  return cards;
};

/** "Meetup #52", else the title without the group's name and the "hosted by" part: "Agentic Football Cup 2026". */
export const meetupHeadline = (m: Pick<ArchiveMeetup, "title" | "number">): string => {
  if (m.number) return `Meetup #${m.number}`;
  const name = m.title
    .replace(/^AWS User Group Vienna presents:\s*/i, "")
    .split(/\s+[-\u2013\u2014]\s+(?=hosted|sponsored)/i)[0]!
    .trim();
  return name || m.title;
};

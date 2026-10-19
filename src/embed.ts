/**
 * The meetup page's header (the web player's embed mode) as the scenes see
 * it. Only the player's EmbedShow provides it; in Studio, in a render and on
 * the room screen useEmbed() is null and every scene draws exactly as before.
 *
 * With it:
 *   - things on screen are links (components/Linked.tsx): agenda rows, speakers,
 *     sponsors, community days, QR codes, groups, the team, the meetups;
 *   - the scenes hold one view (the pre-show its event card, Welcome and Break
 *     their first view): the header's tour is what moves from screen to screen;
 *   - the chrome (logo, countdown) is drawn settled, so the crossfade between
 *     two screens of the tour does not make it blink.
 */
import { createContext, useContext } from "react";
import type { EventFile } from "./event.schema";

export type Embed = {
  /** Where the website's pages are, "" for this origin (the header is an iframe on awscommunity.at). */
  site: string;
};

const EmbedContext = createContext<Embed | null>(null);
export const EmbedProvider = EmbedContext.Provider;
export const useEmbed = (): Embed | null => useContext(EmbedContext);

/** The website's slug for a person, as its personSlug: "Darko Mesaroš" -> "darko-mesaros". */
export const personSlug = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** A link: a page of the website (opened in the top window) or another site (a new tab). */
export type Href = { href: string; target: "top" | "blank" };

const WEBSITE = /^https?:\/\/(www\.)?awscommunity\.at(\/|$)/;

/** A meetup's page on the website. */
export const meetupPage = (embed: Embed, id: string, hash = ""): Href => ({ href: `${embed.site}/meetups/${id}/${hash}`, target: "top" });

/** An agenda row: its dialog on this meetup's page. */
export const agendaHref = (embed: Embed, event: Pick<EventFile, "id">, segmentId: string): Href => meetupPage(embed, event.id, `#agenda-${segmentId}`);

/** A speaker of the evening: their dialog on this meetup's page. */
export const speakerHref = (embed: Embed, event: Pick<EventFile, "id">, name: string): Href => meetupPage(embed, event.id, `#speaker-${personSlug(name)}`);

/** Any URL: the website's own pages in the top window, everything else in a new tab. */
export const urlHref = (embed: Embed, url: string): Href =>
  WEBSITE.test(url) ? { href: `${embed.site}${url.replace(WEBSITE, "/")}`, target: "top" } : { href: url, target: "blank" };

/** Whether someone speaks tonight (only they have a dialog on the meetup page). */
export const speaksTonight = (event: Pick<EventFile, "segments">, name: string): boolean =>
  event.segments.some((s) => (s.talk?.speakers ?? []).some((p) => personSlug(p.name) === personSlug(name)));

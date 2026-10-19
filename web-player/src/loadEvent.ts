/**
 * Loading event.json from ?event=<id or url>.
 *
 *   ?event=2026-10-20-aws-meetup-vienna-53   ./events/2026-10-20-aws-meetup-vienna-53.json
 *   ?event=https://example.org/event.json     that URL
 *   ?event=../data/event.json                 that path, relative to the page
 *
 * The file is validated against the same zod schema the scenes and
 * meetup-sync use. Every failure becomes a LoadError the App shows as a
 * readable screen, instead of a blank page or a crashed scene.
 */
import { archiveSchema, type Archive } from "../../src/archive";
import { eventSchema, type EventFile } from "../../src/event.schema";

export type LoadError = {
  title: string;
  detail: string;
  /** One line per schema problem: "segments.3.start: ISO 8601 with an offset". */
  issues: string[];
  url?: string;
};

export type LoadResult = { ok: true; event: EventFile; url: string } | { ok: false; error: LoadError };

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/** The URL ?event points at, resolved against the page; null when ?event is missing or empty. */
export const eventUrlFor = (param: string | null, pageHref: string): string | null => {
  const value = param?.trim();
  if (!value) return null;
  const relative = ID.test(value) ? `./events/${value}.json` : value;
  return new URL(relative, pageHref).href;
};

const USAGE = "Open the player with ?event=<id> (loads ./events/<id>.json) or ?event=<url of an event.json>.";

/** Validate parsed JSON as an event file. */
export const parseEvent = (data: unknown, url: string): LoadResult => {
  const result = eventSchema.safeParse(data);
  if (result.success) return { ok: true, event: result.data, url };
  return {
    ok: false,
    error: {
      title: "This event file does not match the event.json format",
      detail: "Fix the file (or re-run meetup-sync) and reload.",
      issues: result.error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(file)"}: ${i.message}`),
      url,
    },
  };
};

export const loadEvent = async (
  param: string | null,
  pageHref: string,
  fetchImpl: typeof fetch = fetch,
): Promise<LoadResult> => {
  const url = eventUrlFor(param, pageHref);
  if (!url) {
    return { ok: false, error: { title: "No event given", detail: USAGE, issues: [] } };
  }
  let response: Response;
  try {
    // no-cache: a re-synced event.json shows up on reload.
    response = await fetchImpl(url, { cache: "no-cache" });
  } catch (err) {
    return {
      ok: false,
      error: { title: "Could not reach the event file", detail: `${String((err as Error)?.message ?? err)}. ${USAGE}`, issues: [], url },
    };
  }
  // A dev server or a single-page host answers a missing file with index.html and 200.
  const servedHtml = (response.headers.get("content-type") ?? "").includes("text/html");
  if (!response.ok || servedHtml) {
    const notFound = response.status === 404 || servedHtml;
    return {
      ok: false,
      error: {
        title: notFound ? "Event not found" : `The event file could not be loaded (HTTP ${response.status})`,
        detail: notFound ? `There is no event file at this address. ${USAGE}` : USAGE,
        issues: [],
        url,
      },
    };
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      error: { title: "The event file is not valid JSON", detail: "The address answered, but not with JSON.", issues: [], url },
    };
  }
  return parseEvent(data, url);
};

/** Where the meetup archive is: events/archive.json next to the page (scripts/archive-index.mjs writes it). */
export const archiveUrlFor = (pageHref: string): string => new URL("./events/archive.json", pageHref).href;

/**
 * The meetup archive for the header's "Our meetups" and "Our hosts and
 * sponsors", or null: it is optional, and a missing, unreadable or invalid
 * file only leaves those two screens out (with a console note for the last).
 */
export const loadArchive = async (pageHref: string, fetchImpl: typeof fetch = fetch): Promise<Archive | null> => {
  const url = archiveUrlFor(pageHref);
  try {
    const response = await fetchImpl(url, { cache: "no-cache" });
    if (!response.ok || (response.headers.get("content-type") ?? "").includes("text/html")) return null;
    const parsed = archiveSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.warn(`[archive] ${url} does not match the archive format; "Our meetups" and "Our sponsors" are left out`, parsed.error.issues.slice(0, 5));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

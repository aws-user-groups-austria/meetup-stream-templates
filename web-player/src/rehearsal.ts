/**
 * The player's clock, and the rehearsal parameters that move it.
 *
 *   ?at=18:49      start the clock at 18:49 local time (Europe/Vienna) on the
 *                  event's date, then let it run
 *   ?at=18:11:25   the same, to the second
 *   ?speed=10      run the clock ten times faster (with or without ?at)
 *
 * Without either, the clock is the browser's. Pure functions; the 250 ms
 * tick lives in the App.
 */
export const ZONE = "Europe/Vienna";

export type Rehearsal = {
  /** The simulated "now" at page load, or null to use the real clock. */
  atMs: number | null;
  /** The text of ?at as given, for the help overlay. */
  atText: string | null;
  speed: number;
  /** Parameters that were given but could not be used. */
  warnings: string[];
};

const MAX_SPEED = 1000;

/** "18:49" or "18:49:30" to [h, m, s]; null for anything else. */
export const parseAt = (text: string): [number, number, number] | null => {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = Number(m[3] ?? 0);
  if (h > 23 || min > 59 || s > 59) return null;
  return [h, min, s];
};

const partsFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** The wall-clock fields in Vienna for an instant. */
const viennaParts = (epochMs: number) => {
  const p: Record<string, number> = {};
  for (const part of partsFormat.formatToParts(new Date(epochMs))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
};

/** "2026-10-20": the event's date in Vienna. */
export const viennaDate = (iso: string): string => {
  const p = viennaParts(Date.parse(iso));
  const two = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${two(p.month)}-${two(p.day)}`;
};

/** The instant at which Vienna's clocks read `date` `h:m:s`. Handles summer and winter time. */
export const viennaTimeToMs = (date: string, h: number, m: number, s: number): number => {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const wanted = Date.UTC(y, mo - 1, d, h, m, s);
  let guess = wanted;
  // Two rounds settle the offset, including on a day the clocks change.
  for (let i = 0; i < 2; i++) {
    const p = viennaParts(guess);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += wanted - shown;
  }
  return guess;
};

/** Read ?at and ?speed against the event (its date comes from `doorsOpen`). */
export const readRehearsal = (search: string, doorsOpenIso: string): Rehearsal => {
  const params = new URLSearchParams(search);
  const warnings: string[] = [];
  let atMs: number | null = null;
  const atText = params.get("at");
  if (atText !== null) {
    const parsed = parseAt(atText);
    if (parsed) atMs = viennaTimeToMs(viennaDate(doorsOpenIso), ...parsed);
    else warnings.push(`?at=${atText} is not a time like 18:49 or 18:49:30; using the real clock.`);
  }
  let speed = 1;
  const speedText = params.get("speed");
  if (speedText !== null) {
    const n = Number(speedText);
    if (Number.isFinite(n) && n > 0 && n <= MAX_SPEED) speed = n;
    else warnings.push(`?speed=${speedText} is not a number between 0 and ${MAX_SPEED}; running at 1x.`);
  }
  return { atMs, atText: atMs === null ? null : atText, speed, warnings };
};

/**
 * The simulated now: starts at `atMs` (or the real time at page load) and
 * advances `speed` times as fast as the real clock.
 */
export const clockNow = (r: Pick<Rehearsal, "atMs" | "speed">, loadedAtMs: number, realNowMs: number): number =>
  (r.atMs ?? loadedAtMs) + (realNowMs - loadedAtMs) * r.speed;

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** "18:49:07" in Vienna. */
export const viennaClock = (epochMs: number): string => clockFormat.format(new Date(epochMs));

const dayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, weekday: "short", day: "numeric", month: "short" });

/** "Tue 20 Oct" in Vienna. */
export const viennaDay = (epochMs: number): string => dayFormat.format(new Date(epochMs)).replace(",", "");

/** "rehearsal, 10x speed, from 17:55" for the tab title and the badge, or null when the clock is the real one. */
export const rehearsalLabel = (r: Pick<Rehearsal, "atMs" | "atText" | "speed">): string | null =>
  r.atMs === null && r.speed === 1
    ? null
    : ["rehearsal", r.speed !== 1 ? `${r.speed}x speed` : null, r.atText ? `from ${r.atText}` : null].filter(Boolean).join(", ");

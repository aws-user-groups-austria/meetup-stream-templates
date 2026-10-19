/**
 * Formatting times for the screen. Everything is shown in the event's zone
 * (Europe/Vienna) regardless of the machine's zone, so a render in CI and the
 * laptop at the venue agree.
 */
const ZONE = "Europe/Vienna";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const compactDateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, day: "numeric", month: "short", year: "numeric" });

/** en-GB writes "Sept"; every other month has three letters. */
const threeLetters = (s: string): string => s.replace(/\bSept\b/, "Sep");

/** "Tue, 20 Oct 2026" */
export const localShortDate = (iso: string): string => threeLetters(shortDateFormat.format(new Date(iso)));

/** "20 Oct 2026" */
export const localCompactDate = (iso: string): string => threeLetters(compactDateFormat.format(new Date(iso)));

/** "18:10" */
export const localTime = (iso: string): string => timeFormat.format(new Date(iso));

/** "18:10-18:50", with a plain hyphen. */
export const localRange = (startIso: string, endIso: string): string =>
  `${localTime(startIso)}-${localTime(endIso)}`;

/** "Tuesday, 20 October 2026" */
export const localDate = (iso: string): string => dateFormat.format(new Date(iso));

/** Milliseconds between two ISO instants. */
export const msBetween = (fromIso: string, toIso: string): number => Date.parse(toIso) - Date.parse(fromIso);

/**
 * The one countdown format on screen: "1:42:03" (H:MM:SS) from an hour up,
 * "59:59" (MM:SS) below. Rounds up, so the last second reads 00:01 rather
 * than 00:00, and clamps at 00:00.
 */
export const formatCountdown = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  if (total < 3600) return `${p(Math.floor(total / 60))}:${p(s)}`;
  return `${Math.floor(total / 3600)}:${p(Math.floor((total % 3600) / 60))}:${p(s)}`;
};

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const dayNumber = (ms: number): number => {
  const [y, m, d] = dayKeyFormat.format(new Date(ms)).split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
};

/**
 * Before the target's day (in Vienna): "Tomorrow" or "in 4 days", so a
 * countdown opened days early does not read "95:05:06". On the day itself,
 * or once past, null: show the clock countdown.
 */
export const daysAheadLabel = (nowMs: number, targetIso: string): string | null => {
  const days = dayNumber(Date.parse(targetIso)) - dayNumber(nowMs);
  if (days <= 0) return null;
  return days === 1 ? "Tomorrow" : `in ${days} days`;
};

/** A local calendar day, YYYY-MM-DD, as a UTC noon instant: formatting it in UTC never shifts the day. */
const dayInstant = (ymd: string): Date => new Date(`${ymd}T12:00:00Z`);

const dayLongFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const dayMonthFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long" });
const weekdayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" });
/** "Tuesday, 3" */
const weekdayDay = (ymd: string): string => `${weekdayFormat.format(dayInstant(ymd))}, ${Number(ymd.slice(8))}`;

/** "2026-10-22" -> "Thursday, 22 October 2026" */
export const dayLong = (ymd: string): string => dayLongFormat.format(dayInstant(ymd));

/** "2026-10-22" -> "22 October" */
export const dayMonth = (ymd: string): string => dayMonthFormat.format(dayInstant(ymd));

/**
 * One day or a run of days: "Thursday, 22 October 2026", or
 * "Thursday, 22 to Friday, 23 October 2026" within a month, else both in full.
 */
export const dayRange = (ymd: string, endYmd?: string): string => {
  if (!endYmd || endYmd === ymd) return dayLong(ymd);
  if (ymd.slice(0, 7) === endYmd.slice(0, 7)) return `${weekdayDay(ymd)} to ${dayLong(endYmd)}`;
  return `${dayLong(ymd)} to ${dayLong(endYmd)}`;
};

/** "22 October", or "22 to 23 October" for a run of days in one month. */
export const dayMonthRange = (ymd: string, endYmd?: string): string => {
  if (!endYmd || endYmd === ymd) return dayMonth(ymd);
  if (ymd.slice(0, 7) === endYmd.slice(0, 7)) return `${Number(ymd.slice(8))} to ${dayMonth(endYmd)}`;
  return `${dayMonth(ymd)} to ${dayMonth(endYmd)}`;
};

/** The Vienna calendar day of an instant: "2026-10-20". */
export const localDay = (iso: string): string => dayKeyFormat.format(new Date(iso));

const ordinal = (n: number): string => {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
};

/** "20th October", the Canva cards' way of writing the date, in Vienna. */
export const ordinalDate = (iso: string): string => {
  const [, m, d] = localDay(iso).split("-").map(Number);
  const month = dayMonthFormat.format(new Date(Date.UTC(2000, m! - 1, 15, 12))).split(" ")[1];
  return `${ordinal(d!)} ${month}`;
};

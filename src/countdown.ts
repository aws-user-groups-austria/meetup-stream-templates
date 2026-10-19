/**
 * The countdown top right: what the room waits for next, and how long. It
 * follows the clock only (the real clock, or the rehearsal clock of ?at= and
 * ?speed=) and the event as published: stepping with the keys, clicking the
 * bar and the +/- delay keys never change it, so the presenter cannot.
 *
 *   before doors          "Doors open in"     to doorsOpen
 *   doors, before 18:00   "Talks start in"    to the programme's start
 *   during a part         "<next part> in"    to the next part's start ("Break in", "Talk 2 in")
 *   during the closing    "Open until"        the end time, "22:00"
 *   after the end         nothing
 *
 * Format: the one countdown format of the screens (formatCountdown), H:MM:SS
 * from an hour up and MM:SS below; only days ahead of the evening (24 h or
 * more) "2 days 5 h", so a countdown opened early does not read "53:05:06".
 */
import type { EventFile } from "./event.schema";
import { chapters, programmeStart } from "./model";
import { formatCountdown, localTime } from "./time";

export type Countdown = { label: string; value: string; targetMs?: number };

const H = 3_600_000;

/** "2 days 5 h", "1 day 0 h", then "3:05:00", "59:59", "00:01"; rounds up to the second. */
export const formatWait = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  if (total * 1000 >= 24 * H) {
    const days = Math.floor(total / 86_400);
    const hours = Math.floor((total % 86_400) / 3600);
    return `${days} ${days === 1 ? "day" : "days"} ${hours} h`;
  }
  return formatCountdown(ms);
};

/** Like formatWait, but always to the second, also days ahead: "2 days 5:03:09", "1 day 0:00:01", then "3:05:00", "59:59". */
export const formatTicking = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  if (total < 86_400) return formatCountdown(ms);
  const days = Math.floor(total / 86_400);
  const p = (n: number) => String(n).padStart(2, "0");
  const rest = total % 86_400;
  return `${days} ${days === 1 ? "day" : "days"} ${Math.floor(rest / 3600)}:${p(Math.floor((rest % 3600) / 60))}:${p(rest % 60)}`;
};

/** The countdown at `nowMs`, or null after the end (nothing to show). */
export const countdownAt = (event: EventFile, nowMs: number): Countdown | null => {
  const t = (iso: string) => Date.parse(iso);
  if (nowMs >= t(event.end)) return null;
  const until = (label: string, targetMs: number): Countdown => ({ label, value: formatWait(targetMs - nowMs), targetMs });
  if (nowMs < t(event.doorsOpen)) return until("Doors open in", t(event.doorsOpen));
  const start = programmeStart(event);
  if (start && nowMs < t(start.start)) return until("Talks start in", t(start.start));
  const names = new Map(chapters(event).map((c) => [c.id, c.label]));
  const current = [...event.segments].reverse().find((s) => t(s.start) <= nowMs);
  const next = event.segments.find((s) => t(s.start) > nowMs);
  if (current?.kind === "closing" || !next) return { label: "Open until", value: localTime(event.end) };
  return until(`${names.get(next.id) ?? next.title} in`, t(next.start));
};

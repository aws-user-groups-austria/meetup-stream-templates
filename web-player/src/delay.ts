/**
 * Running late: the host presses + (or -) and the rest of the evening moves
 * by a minute. Pure functions over the event, so the run of show, the
 * countdowns and the "back at" times all follow the shifted agenda without
 * knowing about delays.
 *
 * Each press is a Shift: when it was pressed (on the player's clock) and by
 * how much. Applying a shift moves every segment that has not ended by then:
 *
 *   - a segment already under way keeps its start and ends later (or earlier),
 *   - a segment still to come moves start and end,
 *   - a segment that is over stays where it was.
 *
 * Nothing moves past the event's `end` (how long the venue lets us stay) or
 * before the moment of the press. `doorsOpen` and `end` never move.
 */
import type { EventFile } from "../../src/event.schema";

export type Shift = { atMs: number; deltaMs: number };

/** One press of + or -. */
export const DELAY_STEP_MS = 60_000;

const ms = (iso: string): number => Date.parse(iso);

/** The same instant as `iso`, written with the offset `iso` has (Vienna's, in event files). */
const withOffsetOf = (iso: string, epochMs: number): string => {
  const m = /([+-])(\d{2}):(\d{2})$/.exec(iso);
  if (!m) return new Date(epochMs).toISOString();
  const sign = m[1] === "-" ? -1 : 1;
  const offsetMin = sign * (Number(m[2]) * 60 + Number(m[3]));
  const local = new Date(epochMs + offsetMin * 60_000).toISOString().slice(0, 19);
  return `${local}${m[1]}${m[2]}:${m[3]}`;
};

const shiftOnce = (event: EventFile, { atMs, deltaMs }: Shift): EventFile => {
  if (deltaMs === 0) return event;
  const endMs = ms(event.end);
  const clamp = (t: number) => Math.min(endMs, Math.max(atMs, t));
  return {
    ...event,
    segments: event.segments.map((s) => {
      const start = ms(s.start);
      const end = ms(s.end);
      if (end <= atMs) return s;
      const newStart = start > atMs ? clamp(start + deltaMs) : start;
      const newEnd = Math.max(newStart, clamp(end + deltaMs));
      if (newStart === start && newEnd === end) return s;
      return { ...s, start: withOffsetOf(s.start, newStart), end: withOffsetOf(s.end, newEnd) };
    }),
  };
};

/** The event with every shift applied, in the order they were pressed. */
export const applyShifts = (event: EventFile, shifts: readonly Shift[]): EventFile => shifts.reduce(shiftOnce, event);

/** The net delay of all presses, in ms: what the help overlay shows. */
export const totalDelayMs = (shifts: readonly Shift[]): number => shifts.reduce((sum, s) => sum + s.deltaMs, 0);

/** "+5 min", "-1 min", "on time". */
export const formatDelay = (deltaMs: number): string => {
  const min = Math.round(deltaMs / 60_000);
  return min === 0 ? "on time" : `${min > 0 ? "+" : "-"}${Math.abs(min)} min`;
};

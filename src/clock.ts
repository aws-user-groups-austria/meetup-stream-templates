/**
 * The bridge between wall-clock time and the scenes.
 *
 * A composition must be a pure function of frame and props, so a scene never
 * calls Date.now(). The web player owns the clock (real, rehearsal `?at=` or
 * sped up) and puts it on this context; countdowns read it.
 *
 * Nothing provides it in Studio or in a render, so the default is
 * `nowMs: null` and every countdown shows its static fallback (the full length
 * of the wait). Same component, same output, frame for frame.
 *
 * Pattern from the Adria talk's src/presenting/context.ts.
 */
import { createContext, useContext } from "react";
import type { EventFile } from "./event.schema";

export type LiveClock = {
  /** The player's idea of "now", ms since the epoch. null = not live. */
  nowMs: number | null;
  /** Whether that clock is advancing (false while paused or stepped manually). */
  running: boolean;
  /**
   * Jump to a segment by its id: the bottom bar's chapters call it when
   * clicked. Only the web player provides it (manual mode, A goes back to the
   * clock); without it, in Studio and renders, the chapters are plain text.
   */
  goToSegment?: (segmentId: string) => void;
  /**
   * The event as published, before the +/- delay keys moved it: the
   * countdown top right counts to these times, so the presenter cannot
   * change it. Without it the scene's own event.
   */
  schedule?: EventFile;
  /**
   * A countdown the top right shows instead of its usual one, to a fixed
   * moment: the meetup page's header uses it for "Starts in" until doors open,
   * ticking every second even days ahead. Without it, the usual countdown.
   */
  fixedCountdown?: { label: string; targetMs: number };
};

const LiveClockContext = createContext<LiveClock>({ nowMs: null, running: false });

export const LiveClockProvider = LiveClockContext.Provider;

export const useLiveClock = (): LiveClock => useContext(LiveClockContext);

/**
 * Milliseconds until `targetIso`, from the live clock when there is one,
 * otherwise `staticMs`. Negative once the target has passed.
 */
export const useMsUntil = (targetIso: string, staticMs: number): number => {
  const { nowMs } = useLiveClock();
  return nowMs === null ? staticMs : Date.parse(targetIso) - nowMs;
};

/** True only when live and the clock is before `iso`. Static renders say false. */
export const useIsBefore = (iso: string): boolean => {
  const { nowMs } = useLiveClock();
  return nowMs !== null && nowMs < Date.parse(iso);
};

/**
 * The run of show, as pure functions: which scene is on screen for a given
 * event, a given "now" and a manual step offset. No React, no clock, no DOM,
 * so every boundary of the evening can be unit-tested.
 *
 * The evening is a list of steps, in order:
 *   PreShow (also before doors open), one step per scene of each segment
 *   (the welcome has its intro screens, a minute each: Welcome, Who we are,
 *   What we do, Members, Growing together; a talk has two: SpeakerHandover
 *   for its first 90 s, then NowSpeaking),
 *   and AfterEnd from the event's `end`. When the event has an upcoming
 *   community day, an Upcoming step follows each break and the closing; it is
 *   manual-only: the clock never lands on it, the host steps to it with the
 *   arrow keys (or the clicker), and an Upcoming reached early from a break
 *   is released when the next segment starts, like any early "next".
 *
 * Auto: the step on screen is the last one whose start is not after now.
 * In a gap between segments the previous step holds; before doors it is
 * PreShow; from `end` on it is AfterEnd.
 *
 * Manual: the host steps forward or back. The player keeps a pin (the step
 * index it moved to); `runOfShow` takes the offset of that pin from where
 * the clock is. A pin ahead of the clock is released once the clock catches
 * up with it, so pressing "next" a minute early simply arrives early and the
 * evening carries on by itself. A pin behind the clock stays until A.
 */
import type { EventFile, Segment } from "../../src/event.schema";
import { upcomingFor } from "../../src/model";
import { INTRO_SCREEN_MS, SPEAKER_HANDOVER_MS, scenesInSegment, type SceneId } from "../../src/sceneFor";

export type Step = {
  sceneId: SceneId;
  /** The segment the scene is about; undefined for AfterEnd and a pre-show with no networking segment. */
  segment: Segment | undefined;
  /** When the clock reaches this step, ms since the epoch (for a manual step: its segment's start). */
  startMs: number;
  /** Only reachable by stepping; auto mode never shows it. */
  manual?: true;
};

export type Mode = "auto" | "manual";

/** Where the clock is, regardless of what is on screen. */
export type Phase = "before-doors" | "open" | "after-end";

export type Show = {
  mode: Mode;
  phase: Phase;
  /** Index into `steps` of what is on screen, and of what the clock says. */
  index: number;
  autoIndex: number;
  steps: Step[];
  step: Step;
  sceneId: SceneId;
  /**
   * The segment the clock (or the host) is in. Undefined before doors open,
   * when the pre-show is up but no segment has begun; `step.segment` is
   * what the scene on screen is about.
   */
  segment: Segment | undefined;
  /** When the step on screen begins by the clock. */
  sceneStartMs: number;
  /** The step after the one on screen, if any: what "next" shows. */
  next: Step | undefined;
  /** The next step the clock will reach by itself (skips manual steps). */
  nextAuto: Step | undefined;
  /** The segment after the one on screen, if any (for "what comes next"). */
  nextSegment: Segment | undefined;
  /** Ms from now until `nextAuto` begins by the clock; null on the last step. */
  remainingMs: number | null;
};

const ms = (iso: string): number => Date.parse(iso);

/** Segments after which the host can step to the next community day. */
const UPCOMING_AFTER: ReadonlySet<Segment["kind"]> = new Set(["break", "closing"]);

export const buildSteps = (event: EventFile): Step[] => {
  const steps: Step[] = [];
  const upcoming = upcomingFor(event).length > 0;
  const first = event.segments[0];
  if (!first || first.kind !== "networking") {
    steps.push({ sceneId: "PreShow", segment: undefined, startMs: ms(event.doorsOpen) });
  }
  for (const segment of event.segments) {
    const start = ms(segment.start);
    const end = ms(segment.end);
    const scenes = scenesInSegment(segment, event);
    // The welcome's intro screens share the segment: a minute each, less when it is shorter.
    const introMs = Math.min(INTRO_SCREEN_MS, (end - start) / scenes.length);
    scenes.forEach((sceneId, i) => {
      // A talk shorter than the handover still gets its NowSpeaking step, at its end.
      const startMs =
        sceneId === "NowSpeaking" ? Math.min(start + SPEAKER_HANDOVER_MS, end) : segment.kind === "welcome" ? start + Math.round(i * introMs) : start;
      steps.push({ sceneId, segment, startMs });
    });
    if (upcoming && UPCOMING_AFTER.has(segment.kind)) steps.push({ sceneId: "Upcoming", segment, startMs: start, manual: true });
  }
  steps.push({ sceneId: "AfterEnd", segment: undefined, startMs: ms(event.end) });
  return steps;
};

/** The step the clock says, as an index into `steps`. */
export const autoIndexAt = (steps: Step[], event: EventFile, nowMs: number): number => {
  const last = steps.length - 1;
  if (nowMs >= ms(event.end)) return last;
  let index = 0;
  for (let i = 0; i < last; i++) {
    if (!steps[i]!.manual && steps[i]!.startMs <= nowMs) index = i;
  }
  return index;
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

export const phaseAt = (event: EventFile, nowMs: number): Phase =>
  nowMs < ms(event.doorsOpen) ? "before-doors" : nowMs >= ms(event.end) ? "after-end" : "open";

/** What is on screen: the clock's step moved by `offset` steps, clamped to the evening. */
export const runOfShow = (event: EventFile, nowMs: number, offset = 0): Show => {
  const steps = buildSteps(event);
  const autoIndex = autoIndexAt(steps, event, nowMs);
  const index = clamp(autoIndex + offset, 0, steps.length - 1);
  const step = steps[index]!;
  const next = steps[index + 1];
  const nextAuto = steps.slice(index + 1).find((s) => !s.manual);
  const segmentIndex = step.segment ? event.segments.indexOf(step.segment) : -1;
  // Before doors open the pre-show is already up, but its segment (doors)
  // has not begun: there is no current segment yet, and doors is the next one.
  const notStarted = index === autoIndex && step.startMs > nowMs;
  const nextSegment =
    step.sceneId === "AfterEnd"
      ? undefined
      : notStarted && step.segment
        ? step.segment
        : step.segment
          ? event.segments[segmentIndex + 1]
          : event.segments[0];
  return {
    mode: index === autoIndex ? "auto" : "manual",
    phase: phaseAt(event, nowMs),
    index,
    autoIndex,
    steps,
    step,
    sceneId: step.sceneId,
    segment: notStarted ? undefined : step.segment,
    sceneStartMs: step.startMs,
    next,
    nextAuto,
    nextSegment,
    remainingMs: nextAuto ? nextAuto.startMs - nowMs : null,
  };
};

// ------------------------------------------------------------------ manual

/** A manual position: the step index the host moved to, and whether that was ahead of the clock. */
export type Pin = { index: number; ahead: boolean };

/**
 * Drop a pin the clock has caught up with. Called on every tick, so an early
 * "next" turns back into auto mode when the agenda gets there.
 */
export const resolvePin = (event: EventFile, nowMs: number, pin: Pin | null): Pin | null => {
  if (!pin) return null;
  const autoIndex = autoIndexAt(buildSteps(event), event, nowMs);
  if (pin.index === autoIndex) return null;
  if (pin.ahead && autoIndex >= pin.index) return null;
  return pin;
};

/** Next (+1) or previous (-1) from what is on screen. Landing on the clock's own step is auto again. */
export const step = (event: EventFile, nowMs: number, pin: Pin | null, delta: number): Pin | null => {
  const steps = buildSteps(event);
  const autoIndex = autoIndexAt(steps, event, nowMs);
  const from = resolvePin(event, nowMs, pin)?.index ?? autoIndex;
  const index = clamp(from + delta, 0, steps.length - 1);
  return index === autoIndex ? null : { index, ahead: index > autoIndex };
};

/** The offset `runOfShow` takes for a pin. */
export const offsetFor = (event: EventFile, nowMs: number, pin: Pin | null): number => {
  const live = resolvePin(event, nowMs, pin);
  return live ? live.index - autoIndexAt(buildSteps(event), event, nowMs) : 0;
};

/**
 * A click on a chapter of the bottom bar: the first step of that segment (by
 * the clock, so never a manual-only one), as a pin; null when that is where
 * the clock already is. Like a key press, it is manual mode and A goes back.
 */
export const jumpToSegment = (event: EventFile, nowMs: number, segmentId: string): Pin | null => {
  const steps = buildSteps(event);
  const autoIndex = autoIndexAt(steps, event, nowMs);
  const index = steps.findIndex((s) => !s.manual && s.segment?.id === segmentId);
  if (index === -1 || index === autoIndex) return null;
  return { index, ahead: index > autoIndex };
};

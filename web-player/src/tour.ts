/**
 * The meetup page's header (embed mode, `?embed=1`), as pure functions: what
 * it shows for an event at a given time. No React, no clock, no DOM.
 *
 *   before doors   a tour of the evening's screens, one after the other, that
 *                  always comes back to the event's own card (the pre-show),
 *                  with a fixed "Starts in" countdown to doors open
 *   doors to end   the room screen itself: what the clock says is on now
 *   after the end  the tour again, from "Thank you for coming", no countdown
 *
 * The tour runs on its own clock (TourClock: which stop, how far into it),
 * which the header advances by the time that passed, and not while the
 * pointer rests on the header (paused). A visitor may click around: a dot
 * jumps the tour to that stop; a click on the stage or a bar chapter is a
 * visit, that screen for IDLE_MS, then the tour carries on after it (or the
 * clock, during the evening). Nothing a visitor does changes the clock or the
 * countdown, and the rehearsal parameters (?at=, ?speed=) do not apply here.
 */
import { hostsBefore, meetupsAround, type Archive } from "../../src/archive";
import type { EventFile, Segment } from "../../src/event.schema";
import { chapters, upcomingFor } from "../../src/model";
import type { SceneId } from "../../src/sceneFor";
import { buildSteps, phaseAt, type Phase, type Step } from "./runOfShow";

/** One screen of the tour; `index` picks the item of a list scene (CommunityDay: which community day). */
export type TourStop = { sceneId: SceneId; segment: Segment | undefined; dwellMs: number; label: string; index?: number };

/** How long each screen of the tour stays up. */
export const TOUR_DWELL_MS = 9_000;
/** The event's own card (and "Thank you for coming" after the evening) stays longer: it is what the tour comes back to. */
export const TOUR_HOME_MS = 14_000;
/** After a visitor's click, how long the header waits before it goes back by itself. */
export const IDLE_MS = 20_000;
/** A longer gap between two ticks (a hidden tab, a sleeping laptop) counts as this much, so the tour never skips screens. */
export const MAX_TICK_MS = 1_000;

/** The welcome's screens, the sponsor and the talks: the evening's own screens in the tour. */
/**
 * The evening's screens the header tours: the ones that read at the size of a
 * page header (big photos, a logo, a title). The text-heavy ones (the agenda,
 * the welcome screens) stay on the room screen; the meetup page shows that
 * content itself, right below the header.
 */
const EVENING: ReadonlySet<SceneId> = new Set(["SponsorHandover", "SpeakerHandover"]);

const LABEL: Partial<Record<SceneId, string>> = {
  PreShow: "Event",
  AfterEnd: "Thank you",
  Agenda: "Agenda",
  Welcome: "Welcome",
  WhoWeAre: "Our team",
  WhatWeDo: "Our groups",
  Members: "Members",
  GrowingTogether: "Code of Conduct",
  SponsorHandover: "Our host",
  CommunityDay: "Community day",
  OurMeetups: "Our meetups",
  OurSponsors: "Our sponsors",
  Upcoming: "Community day",
};

/** A short name for a screen, for the pill ("Next: Agenda") and the dots: a talk by its chapter ("Talk 1"). */
export const stopLabel = (event: EventFile, sceneId: SceneId, segment: Segment | undefined): string => {
  if (segment && (sceneId === "SpeakerHandover" || sceneId === "NowSpeaking" || sceneId === "Break" || sceneId === "Closing")) {
    return chapters(event).find((c) => c.id === segment.id)?.label ?? segment.title;
  }
  return LABEL[sceneId] ?? sceneId;
};

const stop = (event: EventFile, sceneId: SceneId, segment: Segment | undefined, dwellMs = TOUR_DWELL_MS): TourStop => ({
  sceneId,
  segment,
  dwellMs,
  label: stopLabel(event, sceneId, segment),
});

/** "Community Day Adria" for "AWS Community Day Adria": the pill and the dots are small. */
const dayLabel = (name: string): string => name.replace(/^AWS\s+/, "");

/**
 * The tour's stops, in order. Before the evening: the event card, the
 * agenda, the welcome's screens, the sponsor, each talk, each upcoming
 * community day (one screen each), our meetups and our hosts and sponsors (those two only
 * with the archive), then back to the card. After it: "Thank you for coming"
 * first, the same rest. A screen without its data is left out.
 */
export const buildTour = (event: EventFile, phase: Exclude<Phase, "open">, archive: Archive | null = null): TourStop[] => {
  const seen = new Set<string>();
  const evening: TourStop[] = [];
  for (const s of buildSteps(event)) {
    if (!EVENING.has(s.sceneId)) continue;
    const key = `${s.sceneId}:${s.segment?.id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    evening.push(stop(event, s.sceneId, s.segment));
  }
  const doors = event.segments.find((s) => s.kind === "networking");
  const home = phase === "after-end" ? stop(event, "AfterEnd", undefined, TOUR_HOME_MS) : stop(event, "PreShow", doors, TOUR_HOME_MS);
  return [
    home,
    ...evening,
    ...upcomingFor(event).map((u, index): TourStop => ({ ...stop(event, "CommunityDay", undefined), index, label: dayLabel(u.name) })),
    ...(meetupsAround(archive, event).length > 0 ? [stop(event, "OurMeetups", undefined)] : []),
    ...(hostsBefore(archive, event).length > 0 ? [stop(event, "OurSponsors", undefined)] : []),
  ];
};

/** Where the tour is: the stop, and how long it has been up. */
export type TourClock = { index: number; elapsedMs: number };

/** A visitor's click: a screen held for `leftMs` more, then the tour carries on at `resumeIndex`. */
export type Visit = { sceneId: SceneId; segment: Segment | undefined; index?: number; leftMs: number; resumeIndex: number };

export type HeaderState = { tour: TourClock; visit: Visit | null };

export const startState = (): HeaderState => ({ tour: { index: 0, elapsedMs: 0 }, visit: null });

const wrap = (i: number, n: number): number => (n === 0 ? 0 : ((i % n) + n) % n);

/** The tour clock `dtMs` later; it loops for ever. */
export const advanceTour = (tour: TourStop[], clock: TourClock, dtMs: number): TourClock => {
  if (tour.length === 0) return clock;
  let index = wrap(clock.index, tour.length);
  let elapsedMs = clock.elapsedMs + Math.max(0, dtMs);
  while (elapsedMs >= tour[index]!.dwellMs) {
    elapsedMs -= tour[index]!.dwellMs;
    index = wrap(index + 1, tour.length);
  }
  return { index, elapsedMs };
};

/**
 * One tick of the header: `dtMs` passed. Paused (the pointer on the header),
 * nothing moves. A visit counts down and then hands back to the tour, at the
 * start of the stop after the one visited; the tour runs only without a visit.
 */
export const tickHeader = (tour: TourStop[], state: HeaderState, dtMs: number, paused: boolean): HeaderState => {
  if (paused) return state;
  const dt = Math.min(MAX_TICK_MS, Math.max(0, dtMs));
  if (state.visit) {
    const leftMs = state.visit.leftMs - dt;
    return leftMs > 0 ? { ...state, visit: { ...state.visit, leftMs } } : { tour: { index: wrap(state.visit.resumeIndex, tour.length), elapsedMs: 0 }, visit: null };
  }
  return { ...state, tour: advanceTour(tour, state.tour, dt) };
};

/** A dot: straight to that stop of the tour, from its start; a visit in progress ends. */
export const jumpTo = (tour: TourStop[], index: number): HeaderState => ({ tour: { index: wrap(index, tour.length), elapsedMs: 0 }, visit: null });

export type HeaderView = {
  phase: Phase;
  sceneId: SceneId;
  segment: Segment | undefined;
  /** The item of a list scene (CommunityDay), when there is one. */
  index?: number;
  /** "tour", "live" (the clock) or "visit" (a visitor's click, until it times out). */
  source: "tour" | "live" | "visit";
  /** The fixed countdown, before doors open only. */
  countdown?: { label: string; targetMs: number };
  /** The tour stop lit in the dots: the one on screen, or during a visit the one before where it goes back to. */
  stopIndex: number | null;
  /** How far the stop on screen (or the visit) is, 0 to 1. */
  progress: number;
  /** What comes by itself next and in how long ("Live" after a visit during the evening); null on the clock. */
  next: { label: string; inMs: number } | null;
};

/** The step the clock is on (never a manual-only one). */
const liveStep = (steps: Step[], event: EventFile, nowMs: number): Step => {
  let found = steps[0]!;
  for (const s of steps) if (!s.manual && s.startMs <= nowMs && s.sceneId !== "AfterEnd") found = s;
  return nowMs >= Date.parse(event.end) ? steps[steps.length - 1]! : found;
};

/** The tour for the phase at `nowMs`: during the evening there is none (the clock leads). */
export const tourAt = (event: EventFile, nowMs: number, archive: Archive | null = null): TourStop[] => {
  const phase = phaseAt(event, nowMs);
  return phase === "open" ? [] : buildTour(event, phase, archive);
};

/** What the header shows at `nowMs`: a visit while it lasts, else the clock during the evening, else the tour. */
export const headerView = (event: EventFile, nowMs: number, tour: TourStop[], state: HeaderState): HeaderView => {
  const phase = phaseAt(event, nowMs);
  const countdown = phase === "before-doors" ? { label: "Starts in", targetMs: Date.parse(event.doorsOpen) } : undefined;
  const base = { phase, ...(countdown ? { countdown } : {}) };
  const live = phase === "open" || tour.length === 0;
  const visit = state.visit;
  if (visit) {
    return {
      ...base,
      sceneId: visit.sceneId,
      segment: visit.segment,
      ...(visit.index !== undefined ? { index: visit.index } : {}),
      source: "visit",
      stopIndex: live ? null : wrap(visit.resumeIndex - 1, tour.length),
      progress: Math.min(1, Math.max(0, 1 - visit.leftMs / IDLE_MS)),
      next: { label: live ? "Live" : tour[wrap(visit.resumeIndex, tour.length)]!.label, inMs: visit.leftMs },
    };
  }
  if (live) {
    const s = liveStep(buildSteps(event), event, nowMs);
    return { ...base, sceneId: s.sceneId, segment: s.segment, source: "live", stopIndex: null, progress: 0, next: null };
  }
  const index = wrap(state.tour.index, tour.length);
  const here = tour[index]!;
  return {
    ...base,
    sceneId: here.sceneId,
    segment: here.segment,
    ...(here.index !== undefined ? { index: here.index } : {}),
    source: "tour",
    stopIndex: index,
    progress: Math.min(1, state.tour.elapsedMs / here.dwellMs),
    next: { label: tour[wrap(index + 1, tour.length)]!.label, inMs: Math.max(0, here.dwellMs - state.tour.elapsedMs) },
  };
};

/** The tour stop showing this screen, if the tour has it. */
const indexOf = (tour: TourStop[], sceneId: SceneId, segment: Segment | undefined, index?: number): number =>
  tour.findIndex((s) => s.sceneId === sceneId && s.segment?.id === segment?.id && s.index === index);

/** A click on a bar chapter: that segment's first screen, as a visit. After it, the tour carries on after that screen, or where it was. */
export const visitSegment = (event: EventFile, tour: TourStop[], state: HeaderState, segmentId: string): Visit | null => {
  const s = buildSteps(event).find((x) => !x.manual && x.segment?.id === segmentId);
  if (!s) return null;
  const at = indexOf(tour, s.sceneId, s.segment);
  const current = state.visit ? state.visit.resumeIndex : state.tour.index;
  return { sceneId: s.sceneId, segment: s.segment, leftMs: IDLE_MS, resumeIndex: at === -1 ? current : at + 1 };
};

/** A click on the stage: the next screen after the one on view (of the tour, or of the evening), as a visit. */
export const visitNext = (event: EventFile, tour: TourStop[], view: HeaderView): Visit => {
  if (view.phase === "open" || tour.length === 0) {
    const list = buildSteps(event).filter((s) => !s.manual);
    const i = list.findIndex((s) => s.sceneId === view.sceneId && s.segment?.id === view.segment?.id);
    const next = list[wrap(i + 1, list.length)]!;
    return { sceneId: next.sceneId, segment: next.segment, leftMs: IDLE_MS, resumeIndex: 0 };
  }
  const i = indexOf(tour, view.sceneId, view.segment, view.index);
  const at = wrap((i === -1 ? (view.stopIndex ?? 0) : i) + 1, tour.length);
  const next = tour[at]!;
  return { sceneId: next.sceneId, segment: next.segment, ...(next.index !== undefined ? { index: next.index } : {}), leftMs: IDLE_MS, resumeIndex: at + 1 };
};

/** The pill: "Next: Agenda · 6 s", "Back to the tour in 15 s", "Paused · next: Agenda", "Live now". */
export const pillText = (view: HeaderView, paused: boolean): string => {
  const secs = (ms: number) => `${Math.max(1, Math.ceil(ms / 1000))} s`;
  if (view.source === "visit" && view.next) {
    const back = view.next.label === "Live" ? "Back to live" : "Back to the tour";
    return paused ? `Paused · ${back.toLowerCase()} in ${secs(view.next.inMs)}` : `${back} in ${secs(view.next.inMs)}`;
  }
  // Otherwise no pill: the progress line and the dots show that the tour runs (a calm header).
  if (view.source === "live") return "Live now";
  return "";
};

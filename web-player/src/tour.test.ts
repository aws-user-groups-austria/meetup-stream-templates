import { describe, expect, it } from "vitest";
import { archiveSchema } from "../../src/archive";
import { eventSchema, type EventFile } from "../../src/event.schema";
import real from "../public/events/2026-10-20-aws-meetup-vienna-53.json";
import archiveRaw from "../../examples/archive.sample.json";
import { viennaTimeToMs } from "./rehearsal";
import {
  advanceTour,
  buildTour,
  headerView,
  IDLE_MS,
  jumpTo,
  MAX_TICK_MS,
  pillText,
  startState,
  tickHeader,
  tourAt,
  TOUR_DWELL_MS,
  TOUR_HOME_MS,
  visitNext,
  visitSegment,
  type HeaderState,
} from "./tour";

const event: EventFile = eventSchema.parse(real);
const archive = archiveSchema.parse(archiveRaw);
const at = (hhmm: string, day = "2026-10-20") => {
  const [h, m] = hhmm.split(":").map(Number);
  return viennaTimeToMs(day, h!, m!, 0);
};
const ids = (tour: ReturnType<typeof buildTour>) => tour.map((s) => `${s.sceneId}${s.segment ? `:${s.segment.id}` : ""}`);
const dayBefore = at("12:00", "2026-10-19");

/** `ms` of tour time, in 250 ms ticks as the header runs it. */
const run = (tour: ReturnType<typeof buildTour>, state: HeaderState, ms: number, paused = false): HeaderState => {
  let s = state;
  for (let t = 0; t < ms; t += 250) s = tickHeader(tour, s, 250, paused);
  return s;
};

describe("the meetup page's header: the tour", () => {
  it("before doors: the event card, the host, the talks, the community days, our meetups, our sponsors (the screens that read at header size)", () => {
    const tour = buildTour(event, "before-doors", archive);
    expect(ids(tour)).toEqual([
      "PreShow:doors",
      "SponsorHandover:sponsor",
      "SpeakerHandover:talk-1",
      "SpeakerHandover:talk-2",
      "CommunityDay",
      "CommunityDay",
      "OurMeetups",
      "OurSponsors",
    ]);
    expect(tour[0]!.dwellMs).toBe(TOUR_HOME_MS);
    expect(tour.slice(1).every((s) => s.dwellMs === TOUR_DWELL_MS)).toBe(true);
    expect(tour.map((s) => s.label)).toEqual([
      "Event",
      "Our host",
      "Talk 1",
      "Talk 2",
      "Community Day Adria",
      "Community Day Switzerland",
      "Our meetups",
      "Our sponsors",
    ]);
  });

  it("after the evening starts with Thank you for coming, then the same rest", () => {
    const tour = buildTour(event, "after-end", archive);
    expect(tour[0]).toMatchObject({ sceneId: "AfterEnd", dwellMs: TOUR_HOME_MS });
    expect(ids(tour).slice(1)).toEqual(ids(buildTour(event, "before-doors", archive)).slice(1));
  });

  it("leaves out our meetups and our sponsors without the archive, and the community days without upcoming", () => {
    expect(ids(buildTour(event, "before-doors", null))).not.toContain("OurMeetups");
    expect(ids(buildTour(event, "before-doors", null))).not.toContain("OurSponsors");
    const { upcoming: _drop, ...rest } = event;
    expect(ids(buildTour(rest as EventFile, "before-doors", archive))).not.toContain("CommunityDay");
  });

  it("has no tour during the evening: the clock leads", () => {
    expect(tourAt(event, at("18:20"), archive)).toEqual([]);
    expect(tourAt(event, dayBefore, archive)[0]!.sceneId).toBe("PreShow");
    expect(tourAt(event, at("23:00"), archive)[0]!.sceneId).toBe("AfterEnd");
  });
});

describe("the tour runs by itself", () => {
  const tour = buildTour(event, "before-doors", archive);
  const total = TOUR_HOME_MS + (tour.length - 1) * TOUR_DWELL_MS;

  it("moves to the next stop when one has been up long enough, and loops back to the event card", () => {
    expect(advanceTour(tour, { index: 0, elapsedMs: 0 }, TOUR_HOME_MS - 1)).toEqual({ index: 0, elapsedMs: TOUR_HOME_MS - 1 });
    expect(advanceTour(tour, { index: 0, elapsedMs: 0 }, TOUR_HOME_MS)).toEqual({ index: 1, elapsedMs: 0 });
    expect(advanceTour(tour, { index: 0, elapsedMs: 0 }, total)).toEqual({ index: 0, elapsedMs: 0 });
    expect(advanceTour(tour, { index: 0, elapsedMs: 0 }, total * 3 + TOUR_HOME_MS + 5)).toEqual({ index: 1, elapsedMs: 5 });
  });

  it("shows the progress of the stop on view and what comes next, and how soon", () => {
    const s = run(tour, startState(), 7_000);
    const v = headerView(event, dayBefore, tour, s);
    expect(v).toMatchObject({ source: "tour", sceneId: "PreShow", stopIndex: 0 });
    expect(v.progress).toBeCloseTo(7 / 14, 5);
    expect(v.next).toEqual({ label: "Our host", inMs: 7_000 });
    // no pill while the tour just runs: the progress line and the dots show it
    expect(pillText(v, false)).toBe("");
  });

  it("pauses while the pointer is on the header, and goes on from there", () => {
    const s = run(tour, startState(), 5_000);
    const held = run(tour, s, 60_000, true);
    expect(held).toEqual(s);
    expect(pillText(headerView(event, dayBefore, tour, held), true)).toBe("");
    expect(run(tour, held, 9_000).tour).toEqual({ index: 1, elapsedMs: 0 });
  });

  it("never skips screens after a long gap (a hidden tab)", () => {
    expect(tickHeader(tour, startState(), 10 * 60_000, false).tour).toEqual({ index: 0, elapsedMs: MAX_TICK_MS });
  });

  it("a dot jumps to its stop, from the start of it", () => {
    const s = jumpTo(tour, 6);
    expect(headerView(event, dayBefore, tour, s)).toMatchObject({ sceneId: "OurMeetups", stopIndex: 6, progress: 0 });
  });
});

describe("the header by the clock", () => {
  const tour = (now: number) => tourAt(event, now, archive);

  it("the day before: the tour, with the fixed Starts in countdown to doors open", () => {
    const v = headerView(event, dayBefore, tour(dayBefore), startState());
    expect(v).toMatchObject({ phase: "before-doors", source: "tour", sceneId: "PreShow" });
    expect(v.countdown).toEqual({ label: "Starts in", targetMs: Date.parse(event.doorsOpen) });
  });

  it("during the evening: what the room screen shows, no fixed countdown, no tour", () => {
    const v = (t: number) => headerView(event, t, tour(t), startState());
    expect(v(at("17:30"))).toMatchObject({ phase: "open", source: "live", sceneId: "PreShow", stopIndex: null, next: null });
    expect(v(at("18:20"))).toMatchObject({ source: "live", sceneId: "NowSpeaking", segment: { id: "talk-1" } });
    expect(v(at("18:55"))).toMatchObject({ source: "live", sceneId: "Break" });
    expect(v(at("18:20")).countdown).toBeUndefined();
    expect(pillText(v(at("18:20")), false)).toBe("Live now");
  });

  it("after the evening: the tour again, without a countdown", () => {
    const v = headerView(event, at("23:00"), tour(at("23:00")), startState());
    expect(v).toMatchObject({ phase: "after-end", source: "tour", sceneId: "AfterEnd" });
    expect(v.countdown).toBeUndefined();
  });
});

describe("a visitor clicking around", () => {
  const tour = buildTour(event, "before-doors", archive);

  it("a chapter shows that part for IDLE_MS, then the tour carries on after it", () => {
    const visit = visitSegment(event, tour, startState(), "talk-2")!;
    let s: HeaderState = { ...startState(), visit };
    const v = headerView(event, dayBefore, tour, s);
    expect(v).toMatchObject({ source: "visit", sceneId: "SpeakerHandover", segment: { id: "talk-2" } });
    // the countdown keeps counting to doors open during a visit
    expect(v.countdown?.targetMs).toBe(Date.parse(event.doorsOpen));
    expect(pillText(v, false)).toBe(`Back to the tour in ${IDLE_MS / 1000} s`);
    s = run(tour, s, 5_000);
    expect(pillText(headerView(event, dayBefore, tour, s), false)).toBe("Back to the tour in 15 s");
    s = run(tour, s, IDLE_MS - 5_000);
    expect(headerView(event, dayBefore, tour, s)).toMatchObject({ source: "tour", sceneId: "CommunityDay", index: 0, progress: 0 });
  });

  it("a part that is not a tour screen (the break) goes back to where the tour was", () => {
    const before = jumpTo(tour, 3);
    const visit = visitSegment(event, tour, before, "break-1")!;
    expect(visit.sceneId).toBe("Break");
    const after = run(tour, { ...before, visit }, IDLE_MS);
    expect(headerView(event, dayBefore, tour, after)).toMatchObject({ source: "tour", sceneId: "SpeakerHandover", segment: { id: "talk-2" } });
  });

  it("the visit's countdown pauses with the pointer on the header too", () => {
    const visit = visitSegment(event, tour, startState(), "talk-1")!;
    const s = run(tour, { ...startState(), visit }, 60_000, true);
    expect(s.visit?.leftMs).toBe(IDLE_MS);
    expect(pillText(headerView(event, dayBefore, tour, s), true)).toBe(`Paused · back to the tour in ${IDLE_MS / 1000} s`);
  });

  it("during the evening a visit ends back on the clock", () => {
    const now = at("18:20");
    const visit = visitSegment(event, [], startState(), "break-1")!;
    expect(headerView(event, now, [], { ...startState(), visit }).sceneId).toBe("Break");
    expect(pillText(headerView(event, now, [], { ...startState(), visit }), false)).toBe(`Back to live in ${IDLE_MS / 1000} s`);
    const after = run([], { ...startState(), visit }, IDLE_MS);
    expect(headerView(event, now, [], after)).toMatchObject({ source: "live", sceneId: "NowSpeaking" });
  });

  it("a click on the stage shows the next screen, and the last one wraps to the first", () => {
    const first = headerView(event, dayBefore, tour, startState());
    expect(visitNext(event, tour, first)).toMatchObject({ sceneId: "SponsorHandover", resumeIndex: 2 });
    const last = headerView(event, dayBefore, tour, jumpTo(tour, tour.length - 1));
    expect(visitNext(event, tour, last).sceneId).toBe("PreShow");
    // during the evening: the next screen of the evening
    const live = headerView(event, at("18:20"), [], startState());
    expect(visitNext(event, [], live).sceneId).toBe("Break");
  });

  it("shows each coming community day as a screen of its own, and a click goes from one to the next", () => {
    const days = tour.map((t, i) => [t, i] as const).filter(([t]) => t.sceneId === "CommunityDay");
    expect(days.map(([t]) => t.index)).toEqual([0, 1]);
    const first = headerView(event, dayBefore, tour, jumpTo(tour, days[0]![1]));
    expect(first).toMatchObject({ sceneId: "CommunityDay", index: 0 });
    expect(visitNext(event, tour, first)).toMatchObject({ sceneId: "CommunityDay", index: 1 });
  });

  it("a dot ends a visit", () => {
    const visit = visitSegment(event, tour, startState(), "talk-1")!;
    expect(jumpTo(tour, 1)).toEqual({ tour: { index: 1, elapsedMs: 0 }, visit: null });
    expect(visit).not.toBeNull();
  });
});

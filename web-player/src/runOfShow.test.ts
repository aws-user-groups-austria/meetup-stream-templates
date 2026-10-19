import { describe, expect, it } from "vitest";
import sample from "../../examples/event.sample.json";
import { eventSchema, type EventFile } from "../../src/event.schema";
import real from "../public/events/2026-10-20-aws-meetup-vienna-53.json";
import { viennaTimeToMs } from "./rehearsal";
import { buildSteps, jumpToSegment, offsetFor, resolvePin, runOfShow, step, type Pin } from "./runOfShow";

const event: EventFile = eventSchema.parse(real);
const at = (hhmm: string): number => {
  const [h, m, s = 0] = hhmm.split(":").map(Number) as [number, number, number?];
  return viennaTimeToMs("2026-10-20", h, m, s);
};

describe("the evening as steps", () => {
  it("is PreShow, one step per scene of each segment, the manual Upcoming after the break and the closing, then AfterEnd", () => {
    const steps = buildSteps(event);
    expect(steps.map((s) => `${s.sceneId}${s.segment ? `:${s.segment.id}` : ""}`)).toEqual([
      "PreShow:doors",
      "Welcome:welcome",
      "WhoWeAre:welcome",
      "WhatWeDo:welcome",
      "Members:welcome",
      "GrowingTogether:welcome",
      "SponsorHandover:sponsor",
      "SpeakerHandover:talk-1",
      "NowSpeaking:talk-1",
      "Break:break-1",
      "Upcoming:break-1",
      "SpeakerHandover:talk-2",
      "NowSpeaking:talk-2",
      "Closing:closing",
      "Upcoming:closing",
      "AfterEnd",
    ]);
    expect(steps.filter((s) => s.manual).map((s) => s.sceneId)).toEqual(["Upcoming", "Upcoming"]);
  });

  it("without an upcoming community day there is no Upcoming step", () => {
    const { upcoming: _drop, ...rest } = event;
    expect(buildSteps(rest as EventFile).some((s) => s.sceneId === "Upcoming")).toBe(false);
    const past = { ...event, upcoming: [{ name: "Old Day", date: "2026-10-01", location: "Vienna", url: "https://example.org/" }] };
    expect(buildSteps(past).some((s) => s.sceneId === "Upcoming")).toBe(false);
  });

  it("the hand-written sample has the same run of show", () => {
    const s = eventSchema.parse(sample);
    // The sample has no `community`, so its welcome is the Welcome screen alone.
    const intro = new Set(["WhoWeAre", "WhatWeDo", "Members", "GrowingTogether"]);
    expect(buildSteps(s).map((x) => x.sceneId)).toEqual(buildSteps(event).map((x) => x.sceneId).filter((id) => !intro.has(id)));
  });
});

describe("auto mode at every boundary of 20 October", () => {
  const cases: [string, string, string | undefined, string][] = [
    ["16:59", "PreShow", undefined, "before-doors"],
    ["17:00", "PreShow", "doors", "open"],
    ["17:59", "PreShow", "doors", "open"],
    ["18:00", "Welcome", "welcome", "open"],
    ["18:05", "SponsorHandover", "sponsor", "open"],
    ["18:10", "SpeakerHandover", "talk-1", "open"],
    ["18:11:29", "SpeakerHandover", "talk-1", "open"],
    ["18:11:31", "NowSpeaking", "talk-1", "open"],
    ["18:50", "Break", "break-1", "open"],
    ["19:19", "Break", "break-1", "open"],
    ["19:20", "SpeakerHandover", "talk-2", "open"],
    ["20:00", "Closing", "closing", "open"],
    ["21:59", "Closing", "closing", "open"],
    ["22:00", "AfterEnd", undefined, "after-end"],
  ];
  for (const [time, sceneId, segmentId, phase] of cases) {
    it(`${time}: ${sceneId}`, () => {
      const show = runOfShow(event, at(time));
      expect(show.mode).toBe("auto");
      expect(show.sceneId).toBe(sceneId);
      expect(show.segment?.id).toBe(segmentId);
      expect(show.phase).toBe(phase);
    });
  }

  it("the talk handover ends exactly 90 s in", () => {
    expect(runOfShow(event, at("18:11:30") - 1).sceneId).toBe("SpeakerHandover");
    expect(runOfShow(event, at("18:11:30")).sceneId).toBe("NowSpeaking");
    expect(runOfShow(event, at("19:21:29")).sceneId).toBe("SpeakerHandover");
    expect(runOfShow(event, at("19:21:30")).sceneId).toBe("NowSpeaking");
  });

  it("a segment ends at the millisecond before the next one starts", () => {
    expect(runOfShow(event, at("18:00") - 1).sceneId).toBe("PreShow");
    expect(runOfShow(event, at("18:50") - 1).sceneId).toBe("NowSpeaking");
    expect(runOfShow(event, at("22:00") - 1).sceneId).toBe("Closing");
  });

  it("well before the evening and long after it", () => {
    expect(runOfShow(event, at("08:00")).sceneId).toBe("PreShow");
    expect(runOfShow(event, at("23:59")).sceneId).toBe("AfterEnd");
  });

  it("gives what comes next and how long until then", () => {
    const welcome = runOfShow(event, at("18:04:30"));
    expect(welcome.sceneId).toBe("GrowingTogether");
    expect(welcome.next?.sceneId).toBe("SponsorHandover");
    expect(welcome.remainingMs).toBe(30_000);
    expect(welcome.sceneStartMs).toBe(at("18:04"));
    expect(welcome.nextSegment?.id).toBe("sponsor");

    const handover = runOfShow(event, at("18:10:30"));
    expect(handover.next?.sceneId).toBe("NowSpeaking");
    expect(handover.remainingMs).toBe(60_000);
    expect(handover.nextSegment?.id).toBe("break-1");

    const before = runOfShow(event, at("16:55"));
    expect(before.next?.sceneId).toBe("Welcome");
    expect(before.remainingMs).toBe(65 * 60_000);
    // Before doors open no segment is current yet; doors is the next one, and the pre-show is about it.
    expect(before.segment).toBeUndefined();
    expect(before.nextSegment?.id).toBe("doors");
    expect(before.step.segment?.id).toBe("doors");
    const open = runOfShow(event, at("17:00"));
    expect(open.segment?.id).toBe("doors");
    expect(open.nextSegment?.id).toBe("welcome");

    const closing = runOfShow(event, at("21:30"));
    // "next" offers the community day; the clock goes on to AfterEnd by itself.
    expect(closing.next?.sceneId).toBe("Upcoming");
    expect(closing.nextAuto?.sceneId).toBe("AfterEnd");
    expect(closing.remainingMs).toBe(30 * 60_000);
    expect(closing.nextSegment).toBeUndefined();

    const after = runOfShow(event, at("22:05"));
    expect(after.next).toBeUndefined();
    expect(after.remainingMs).toBeNull();
  });
});

describe("manual stepping", () => {
  const show = (time: string, pin: Pin | null) => runOfShow(event, at(time), offsetFor(event, at(time), pin));

  it("next, next, previous, then back to the clock", () => {
    const now = "18:07";
    let pin: Pin | null = null;
    expect(show(now, pin).sceneId).toBe("SponsorHandover");

    pin = step(event, at(now), pin, +1);
    expect(show(now, pin)).toMatchObject({ sceneId: "SpeakerHandover", mode: "manual" });
    expect(show(now, pin).segment?.id).toBe("talk-1");

    pin = step(event, at(now), pin, +1);
    expect(show(now, pin)).toMatchObject({ sceneId: "NowSpeaking", mode: "manual" });

    pin = step(event, at(now), pin, -1);
    expect(show(now, pin)).toMatchObject({ sceneId: "SpeakerHandover", mode: "manual" });

    // A: back to the clock.
    pin = null;
    expect(show(now, pin)).toMatchObject({ sceneId: "SponsorHandover", mode: "auto" });
  });

  it("stepping back onto the clock's own step is auto again", () => {
    const pin = step(event, at("18:07"), null, +1);
    expect(step(event, at("18:07"), pin, -1)).toBeNull();
  });

  it("an early next is released when the clock catches up, and the evening runs on", () => {
    const pin = step(event, at("18:09:30"), null, +1);
    expect(show("18:09:30", pin)).toMatchObject({ sceneId: "SpeakerHandover", mode: "manual" });
    expect(resolvePin(event, at("18:10"), pin)).toBeNull();
    expect(show("18:10", pin)).toMatchObject({ sceneId: "SpeakerHandover", mode: "auto" });
    expect(show("18:12", pin)).toMatchObject({ sceneId: "NowSpeaking", mode: "auto" });
  });

  it("a step back holds until A, even as the clock moves on", () => {
    const pin = step(event, at("18:51"), null, -1);
    expect(show("18:51", pin)).toMatchObject({ sceneId: "NowSpeaking", mode: "manual" });
    expect(show("19:00", pin)).toMatchObject({ sceneId: "NowSpeaking", mode: "manual" });
  });

  it("does not step past either end of the evening", () => {
    expect(step(event, at("16:59"), null, -1)).toBeNull();
    expect(show("16:59", step(event, at("16:59"), null, -1)).sceneId).toBe("PreShow");
    expect(step(event, at("22:30"), null, +1)).toBeNull();
    const far = Array.from({ length: 30 }, (_, i) => i).reduce<Pin | null>((p) => step(event, at("18:00"), p, +1), null);
    expect(show("18:00", far)).toMatchObject({ sceneId: "AfterEnd", mode: "manual" });
  });

  it("an offset alone moves from the clock's step", () => {
    expect(runOfShow(event, at("18:30"), 1).sceneId).toBe("Break");
    expect(runOfShow(event, at("18:30"), -2).sceneId).toBe("SponsorHandover");
    expect(runOfShow(event, at("18:30"), -99).sceneId).toBe("PreShow");
    expect(runOfShow(event, at("18:30"), 99).sceneId).toBe("AfterEnd");
  });
});

describe("the welcome's intro screens", () => {
  it("steps through Welcome, Who we are, What we do, Members, Growing together, a minute each", () => {
    const at18 = (s: string) => runOfShow(event, at(s)).sceneId;
    expect([at18("18:00"), at18("18:01"), at18("18:02"), at18("18:03"), at18("18:04"), at18("18:04:59")]).toEqual([
      "Welcome",
      "WhoWeAre",
      "WhatWeDo",
      "Members",
      "GrowingTogether",
      "GrowingTogether",
    ]);
  });

  it("the keys step through them too, and a click on the Welcome chapter jumps to the first", () => {
    let pin = step(event, at("18:00:10"), null, +1);
    expect(runOfShow(event, at("18:00:10"), offsetFor(event, at("18:00:10"), pin)).sceneId).toBe("WhoWeAre");
    pin = step(event, at("18:00:10"), pin, +1);
    expect(runOfShow(event, at("18:00:10"), offsetFor(event, at("18:00:10"), pin)).sceneId).toBe("WhatWeDo");
    const back = jumpToSegment(event, at("18:30"), "welcome");
    expect(runOfShow(event, at("18:30"), offsetFor(event, at("18:30"), back)).sceneId).toBe("Welcome");
  });

  it("skips a screen without its data, and is the Welcome alone without community", () => {
    const noTeam: EventFile = { ...event, community: { ...event.community!, team: [], codeOfConduct: undefined } };
    expect(buildSteps(noTeam).filter((s) => s.segment?.id === "welcome").map((s) => s.sceneId)).toEqual(["Welcome", "WhatWeDo", "Members"]);
    const { community: _c, ...bare } = event;
    expect(buildSteps(bare as EventFile).filter((s) => s.segment?.id === "welcome").map((s) => s.sceneId)).toEqual(["Welcome"]);
  });
});

describe("the upcoming community day", () => {
  const show = (time: string, pin: Pin | null) => runOfShow(event, at(time), offsetFor(event, at(time), pin));

  it("is never on screen by the clock", () => {
    for (let m = 0; m < 6 * 60; m += 1) {
      const t = at("17:00") + m * 60_000 - 30 * 60_000;
      expect(runOfShow(event, t).sceneId).not.toBe("Upcoming");
    }
  });

  it("is one press away during the break, and the talk takes over when it starts", () => {
    const pin = step(event, at("18:55"), null, +1);
    expect(show("18:55", pin)).toMatchObject({ sceneId: "Upcoming", mode: "manual" });
    expect(show("19:10", pin)).toMatchObject({ sceneId: "Upcoming", mode: "manual" });
    // Back with the left arrow is the break, by the clock again.
    expect(step(event, at("18:55"), pin, -1)).toBeNull();
    // At 19:20 the clock has passed it: the second talk, in auto mode.
    expect(show("19:20", pin)).toMatchObject({ sceneId: "SpeakerHandover", mode: "auto" });
  });

  it("follows the closing, and the next press is the end", () => {
    let pin = step(event, at("20:30"), null, +1);
    expect(show("20:30", pin)).toMatchObject({ sceneId: "Upcoming", mode: "manual" });
    pin = step(event, at("20:30"), pin, +1);
    expect(show("20:30", pin)).toMatchObject({ sceneId: "AfterEnd", mode: "manual" });
  });
});

describe("events of other shapes", () => {
  const base = eventSchema.parse(real);

  it("without a networking segment, PreShow covers the time before the first segment", () => {
    const e: EventFile = { ...base, segments: base.segments.filter((s) => s.kind !== "networking") };
    const steps = buildSteps(e);
    expect(steps[0]).toMatchObject({ sceneId: "PreShow", segment: undefined });
    expect(runOfShow(e, at("17:30")).sceneId).toBe("PreShow");
    expect(runOfShow(e, at("17:30")).nextSegment?.id).toBe("welcome");
    expect(runOfShow(e, at("18:00")).sceneId).toBe("Welcome");
  });

  it("in a gap between segments the previous scene holds", () => {
    const segments = base.segments.map((s) =>
      s.id === "break-1" ? { ...s, end: "2026-10-20T19:10:00+02:00" } : s,
    );
    const e: EventFile = { ...base, segments };
    expect(runOfShow(e, at("19:15")).sceneId).toBe("Break");
    expect(runOfShow(e, at("19:20")).sceneId).toBe("SpeakerHandover");
  });

  it("a talk shorter than the handover still reaches NowSpeaking before the next segment", () => {
    const segments = base.segments.map((s) =>
      s.id === "talk-1" ? { ...s, end: "2026-10-20T18:11:00+02:00" } : s.id === "break-1" ? { ...s, start: "2026-10-20T18:11:00+02:00" } : s,
    );
    const e: EventFile = { ...base, segments };
    expect(runOfShow(e, at("18:10:59")).sceneId).toBe("SpeakerHandover");
    expect(runOfShow(e, at("18:11")).sceneId).toBe("Break");
  });
});

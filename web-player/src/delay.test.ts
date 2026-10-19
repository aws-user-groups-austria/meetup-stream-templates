import { describe, expect, it } from "vitest";
import { eventSchema, type EventFile } from "../../src/event.schema";
import real from "../public/events/2026-10-20-aws-meetup-vienna-53.json";
import { applyShifts, DELAY_STEP_MS, formatDelay, totalDelayMs, type Shift } from "./delay";
import { viennaTimeToMs } from "./rehearsal";
import { runOfShow } from "./runOfShow";

const event: EventFile = eventSchema.parse(real);
const at = (hhmm: string): number => {
  const [h, m, s = 0] = hhmm.split(":").map(Number) as [number, number, number?];
  return viennaTimeToMs("2026-10-20", h, m, s);
};
const presses = (time: string, n: number): Shift[] =>
  Array.from({ length: Math.abs(n) }, () => ({ atMs: at(time), deltaMs: Math.sign(n) * DELAY_STEP_MS }));
const times = (e: EventFile) => Object.fromEntries(e.segments.map((s) => [s.id, `${s.start.slice(11, 16)}-${s.end.slice(11, 16)}`]));

describe("running late", () => {
  it("no presses leave the event as it is", () => {
    expect(applyShifts(event, [])).toBe(event);
  });

  it("five minutes late at the end of the first talk: the talk runs on, the rest moves, the end stays", () => {
    const late = applyShifts(event, presses("18:48", 5));
    expect(times(late)).toEqual({
      doors: "17:00-18:00",
      welcome: "18:00-18:05",
      sponsor: "18:05-18:10",
      "talk-1": "18:10-18:55",
      "break-1": "18:55-19:25",
      "talk-2": "19:25-20:05",
      closing: "20:05-22:00",
    });
    expect(late.end).toBe(event.end);
    expect(late.doorsOpen).toBe(event.doorsOpen);
    // Still valid event.json, with Vienna offsets.
    expect(eventSchema.safeParse(late).success).toBe(true);
    expect(late.segments[4]!.start).toBe("2026-10-20T18:55:00+02:00");
  });

  it("moves what is on screen: at 18:52 it is still the first talk, and the break counts to 19:25", () => {
    const late = applyShifts(event, presses("18:48", 5));
    expect(runOfShow(event, at("18:52")).sceneId).toBe("Break");
    expect(runOfShow(late, at("18:52")).sceneId).toBe("NowSpeaking");
    const brk = runOfShow(late, at("19:00"));
    expect(brk.sceneId).toBe("Break");
    expect(brk.nextAuto?.startMs).toBe(at("19:25"));
    expect(brk.remainingMs).toBe(25 * 60_000);
  });

  it("a press during the break shortens or lengthens only the break and what follows", () => {
    const early = applyShifts(event, presses("19:00", -2));
    expect(times(early)["talk-1"]).toBe("18:10-18:50");
    expect(times(early)["break-1"]).toBe("18:50-19:18");
    expect(times(early)["talk-2"]).toBe("19:18-19:58");
  });

  it("presses add up, each from its own moment", () => {
    const shifts = [...presses("18:48", 5), ...presses("19:30", 3)];
    const late = applyShifts(event, shifts);
    expect(times(late)["talk-1"]).toBe("18:10-18:55");
    expect(times(late)["talk-2"]).toBe("19:25-20:08");
    expect(times(late).closing).toBe("20:08-22:00");
    expect(totalDelayMs(shifts)).toBe(8 * 60_000);
  });

  it("never moves anything past the end, or before the moment of the press", () => {
    const veryLate = applyShifts(event, presses("19:30", 200));
    expect(times(veryLate)["talk-2"]).toBe("19:20-22:00");
    expect(times(veryLate).closing).toBe("22:00-22:00");
    const veryEarly = applyShifts(event, presses("18:30", -60));
    expect(times(veryEarly)["talk-1"]).toBe("18:10-18:30");
    expect(times(veryEarly)["break-1"]).toBe("18:30-18:30");
    // A segment pulled to nothing is skipped: the run of show goes straight on to the next talk.
    const starts = veryEarly.segments.map((x) => Date.parse(x.start));
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(runOfShow(veryEarly, at("18:31")).step.segment?.id).toBe("talk-2");
  });

  it("formats the delay for the help overlay", () => {
    expect(formatDelay(0)).toBe("on time");
    expect(formatDelay(5 * 60_000)).toBe("+5 min");
    expect(formatDelay(-60_000)).toBe("-1 min");
  });
});

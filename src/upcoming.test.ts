import { describe, expect, it } from "vitest";
import sampleRaw from "../examples/event.sample.json";
import stressRaw from "../examples/event.stress.json";
import { eventSchema, type EventFile } from "./event.schema";
import { chapters, hostOf, meetupNumber, roleAt, upcomingFor } from "./model";
import { dayLong, dayMonthRange, dayRange } from "./time";

const sample = eventSchema.parse(sampleRaw);
const stress = eventSchema.parse(stressRaw);

describe("upcoming community days", () => {
  it("lists the coming ones, soonest first", () => {
    expect(upcomingFor(sample).map((u) => u.name)).toEqual(["AWS Community Day Adria", "AWS Community Day Switzerland"]);
  });

  it("drops a day that is over before the evening, and is empty without any", () => {
    expect(upcomingFor(stress).map((u) => u.name)).not.toContain("A past day that must not show");
    const { upcoming: _drop, ...rest } = sample;
    expect(upcomingFor(rest as EventFile)).toEqual([]);
  });

  it("writes days in English", () => {
    expect(dayLong("2026-10-22")).toBe("Thursday, 22 October 2026");
    expect(dayRange("2026-10-22")).toBe("Thursday, 22 October 2026");
    expect(dayRange("2026-11-03", "2026-11-04")).toBe("Tuesday, 3 to Wednesday, 4 November 2026");
    expect(dayRange("2026-10-31", "2026-11-01")).toBe("Saturday, 31 October 2026 to Sunday, 1 November 2026");
    expect(dayMonthRange("2026-10-22")).toBe("22 October");
    expect(dayMonthRange("2026-11-03", "2026-11-04")).toBe("3 to 4 November");
  });

  it("orders the days by date, whatever the order in event.json", () => {
    const reversed: EventFile = { ...sample, upcoming: [...(sample.upcoming ?? [])].reverse() };
    expect(upcomingFor(reversed).map((u) => u.date)).toEqual(["2026-10-22", "2026-10-29"]);
  });
});

describe("bar and card details", () => {
  it("names tonight's chapters for the bottom bar", () => {
    expect(chapters(sample).map((c) => c.label)).toEqual(["Doors", "Welcome", "Sponsor", "Talk 1", "Break", "Talk 2", "Networking"]);
    expect(chapters(stress).map((c) => c.label)).toContain("Break 2");
  });

  it("finds the meetup number", () => {
    expect(meetupNumber(sample)).toBe("#53");
  });

  it("names a speaker's company by the sponsor's short form", () => {
    const talk = sample.segments.find((s) => s.id === "talk-1")!;
    expect(talk.talk!.speakers.map((s) => roleAt(sample, s))).toEqual(["Cloud Architect at RBI", "Senior Technical Account Manager at AWS"]);
  });

  it("knows the host: the sponsor with its logo only when given, else the name from the title", () => {
    expect(hostOf(sample)).toEqual({ name: "Raiffeisen Bank International" });
    const withLogo: EventFile = { ...sample, sponsors: [{ ...sample.sponsors[0]!, logo: "events/x/assets/rbi.png" }] };
    expect(hostOf(withLogo)).toEqual({ name: "Raiffeisen Bank International", logo: "events/x/assets/rbi.png" });
    expect(hostOf({ ...sample, sponsors: [] })).toEqual({ name: "RBI" });
    expect(hostOf({ ...sample, sponsors: [], title: "AWS Meetup Vienna #53" })).toBeUndefined();
  });
});

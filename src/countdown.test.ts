import { describe, expect, it } from "vitest";
import raw from "../../meetup-event-vienna/events/2026-10-20-aws-meetup-vienna-53/event.json";
import { countdownAt, formatTicking, formatWait } from "./countdown";
import { eventSchema } from "./event.schema";

const event = eventSchema.parse(raw);
const at = (iso: string) => Date.parse(iso);
const H = 3_600_000;

describe("formatWait", () => {
  it("days and hours from 24 h", () => {
    expect(formatWait(24 * H)).toBe("1 day 0 h");
    expect(formatWait(2 * 24 * H + 5 * H + 59 * 60_000)).toBe("2 days 5 h");
  });

  it("H:MM:SS from 1 h to just under 24 h", () => {
    expect(formatWait(24 * H - 1000)).toBe("23:59:59");
    expect(formatWait(H)).toBe("1:00:00");
    expect(formatWait(H + 5 * 60_000)).toBe("1:05:00");
  });

  it("a live MM:SS below 1 h, rounded up, never negative", () => {
    expect(formatWait(H - 1000)).toBe("59:59");
    expect(formatWait(H - 1)).toBe("1:00:00");
    expect(formatWait(61_500)).toBe("01:02");
    expect(formatWait(1)).toBe("00:01");
    expect(formatWait(-5000)).toBe("00:00");
  });
});

describe("countdownAt on 20 October", () => {
  it("counts to doors before they open, days ahead too", () => {
    expect(countdownAt(event, at("2026-10-18T15:00:00+02:00"))).toMatchObject({ label: "Doors open in", value: "2 days 2 h" });
    expect(countdownAt(event, at("2026-10-20T16:30:00+02:00"))).toMatchObject({ label: "Doors open in", value: "30:00" });
  });

  it("to the programme while doors are open", () => {
    expect(countdownAt(event, at("2026-10-20T17:00:00+02:00"))).toMatchObject({ label: "Talks start in", value: "1:00:00" });
    expect(countdownAt(event, at("2026-10-20T17:45:30+02:00"))).toMatchObject({ label: "Talks start in", value: "14:30" });
  });

  it("to the next part during the evening", () => {
    expect(countdownAt(event, at("2026-10-20T18:02:00+02:00"))).toMatchObject({ label: "Sponsor in", value: "03:00" });
    expect(countdownAt(event, at("2026-10-20T18:30:00+02:00"))).toMatchObject({ label: "Break in", value: "20:00" });
    expect(countdownAt(event, at("2026-10-20T19:00:00+02:00"))).toMatchObject({ label: "Talk 2 in", value: "20:00" });
    expect(countdownAt(event, at("2026-10-20T19:59:59+02:00"))).toMatchObject({ label: "Networking in", value: "00:01" });
  });

  it("the end time during the closing, and nothing after the end", () => {
    expect(countdownAt(event, at("2026-10-20T20:00:00+02:00"))).toEqual({ label: "Open until", value: "22:00" });
    expect(countdownAt(event, at("2026-10-20T22:00:00+02:00"))).toBeNull();
  });
});

describe("formatTicking (the meetup page's header: to the second, also days ahead)", () => {
  it("counts every second, days included", () => {
    expect(formatTicking(24 * H + 5 * 60_000 + 9_000)).toBe("1 day 0:05:09");
    expect(formatTicking(2 * 24 * H + 3 * H)).toBe("2 days 3:00:00");
    expect(formatTicking(3 * H)).toBe("3:00:00");
    expect(formatTicking(59_000)).toBe("00:59");
  });
});

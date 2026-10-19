import { describe, expect, it } from "vitest";
import raw from "../examples/event.sample.json";
import { eventSchema } from "./event.schema";
import { excerpt, initials, nextEventsUrl, programmeStart, sentences, shortTitle, sponsorFor, sponsorName, sponsorShort, titleSuffix } from "./model";
import { daysAheadLabel, formatCountdown, localRange, localTime } from "./time";

const event = eventSchema.parse(raw);

describe("the sample event", () => {
  it("validates against the schema", () => {
    expect(eventSchema.safeParse(raw).success).toBe(true);
  });

  it("splits the title", () => {
    expect(shortTitle(event)).toBe("AWS Meetup Vienna #53");
    expect(titleSuffix(event)).toBe("hosted by RBI");
  });

  it("names the sponsor without the legal form, and short for the handover", () => {
    const s = sponsorFor(event, event.segments.find((x) => x.kind === "sponsor"));
    expect(s && sponsorName(s)).toBe("Raiffeisen Bank International");
    expect(s && sponsorShort(s)).toBe("RBI");
    expect(s?.logo).toBeUndefined();
  });

  it("starts the programme at 18:00", () => {
    expect(programmeStart(event)?.start).toBe("2026-10-20T18:00:00+02:00");
  });
});

describe("formatting", () => {
  it("shows Vienna local time whatever the machine zone", () => {
    expect(localTime("2026-10-20T16:10:00Z")).toBe("18:10");
    expect(localRange("2026-10-20T18:10:00+02:00", "2026-10-20T18:50:00+02:00")).toBe("18:10-18:50");
  });

  it("counts down in MM:SS below an hour, H:MM:SS from an hour, and clamps at zero", () => {
    expect(formatCountdown(30 * 60_000)).toBe("30:00");
    expect(formatCountdown(61_001)).toBe("01:02");
    expect(formatCountdown(500)).toBe("00:01");
    expect(formatCountdown(-5000)).toBe("00:00");
    expect(formatCountdown(60 * 60_000)).toBe("1:00:00");
    expect(formatCountdown(60 * 60_000 - 1000)).toBe("59:59");
    expect(formatCountdown(100 * 60_000)).toBe("1:40:00");
    expect(formatCountdown(3_723_000)).toBe("1:02:03");
  });

  it("names the day instead of counting hours when the target is on a later Vienna day", () => {
    const doors = "2026-10-20T17:00:00+02:00";
    expect(daysAheadLabel(Date.parse("2026-10-16T13:54:54+02:00"), doors)).toBe("in 4 days");
    expect(daysAheadLabel(Date.parse("2026-10-19T23:59:00+02:00"), doors)).toBe("Tomorrow");
    expect(daysAheadLabel(Date.parse("2026-10-20T00:01:00+02:00"), doors)).toBeNull();
    expect(daysAheadLabel(Date.parse("2026-10-20T16:55:00+02:00"), doors)).toBeNull();
    expect(daysAheadLabel(Date.parse("2026-10-20T18:00:00+02:00"), doors)).toBeNull();
    // Midnight is Vienna midnight: 22:30 UTC on the 19th is already the 20th in Vienna (UTC+2).
    expect(daysAheadLabel(Date.parse("2026-10-19T22:30:00Z"), doors)).toBeNull();
    expect(daysAheadLabel(Date.parse("2026-10-19T21:30:00Z"), doors)).toBe("Tomorrow");
  });

  it("makes initials, including non-ASCII names", () => {
    expect(initials("Darko Mesaroš")).toBe("DM");
    expect(initials("Roman Jokel")).toBe("RJ");
    expect(initials("Cher")).toBe("C");
  });
});

describe("excerpts", () => {
  const notice =
    "By submitting your RSVP, you acknowledge that photos and videos may be taken during the event. If you prefer not to appear in such recordings, please let the organizer know before the event. Please note that we cannot guarantee the retrospective removal, blurring, or editing of individual attendees in group photos or event footage. Any publication of identifiable individual portraits will be subject to separate consent where required.";

  it("splits the real photo notice into its four sentences", () => {
    expect(sentences(notice)).toHaveLength(4);
  });

  it("keeps the first two and says something was cut", () => {
    const e = excerpt(notice, 2);
    expect(e.cut).toBe(true);
    expect(e.text).toBe(
      "By submitting your RSVP, you acknowledge that photos and videos may be taken during the event. If you prefer not to appear in such recordings, please let the organizer know before the event.",
    );
  });

  it("leaves a short text whole", () => {
    expect(excerpt("One. Two.", 2)).toEqual({ text: "One. Two.", cut: false });
    expect(sentences("Use e.g. the app. Then go.")).toEqual(["Use e.g. the app.", "Then go."]);
  });
});

describe("next events", () => {
  it("uses links.nextEvents, else the group page", () => {
    expect(nextEventsUrl({ ...event, links: { ...event.links, nextEvents: "https://awscommunity.at/" } })).toBe("https://awscommunity.at/");
    const { nextEvents: _drop, ...links } = event.links;
    expect(nextEventsUrl({ ...event, links })).toBe(event.group.url);
  });
});

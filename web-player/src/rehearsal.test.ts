import { describe, expect, it } from "vitest";
import { clockNow, parseAt, readRehearsal, rehearsalLabel, viennaClock, viennaDate, viennaDay, viennaTimeToMs } from "./rehearsal";

const DOORS = "2026-10-20T17:00:00+02:00";

describe("Vienna local time", () => {
  it("18:49 on 20 October is 16:49 UTC (summer time)", () => {
    expect(new Date(viennaTimeToMs("2026-10-20", 18, 49, 0)).toISOString()).toBe("2026-10-20T16:49:00.000Z");
  });

  it("18:49 on 3 November is 17:49 UTC (winter time)", () => {
    expect(new Date(viennaTimeToMs("2026-11-03", 18, 49, 0)).toISOString()).toBe("2026-11-03T17:49:00.000Z");
  });

  it("the event date comes from doorsOpen in Vienna, not UTC", () => {
    expect(viennaDate(DOORS)).toBe("2026-10-20");
    expect(viennaDate("2026-10-20T23:30:00+02:00")).toBe("2026-10-20");
    expect(viennaDate("2026-10-20T00:30:00+02:00")).toBe("2026-10-20");
  });

  it("formats a clock", () => {
    expect(viennaClock(Date.parse("2026-10-20T16:49:07Z"))).toBe("18:49:07");
    expect(viennaDay(Date.parse("2026-10-20T16:49:07Z"))).toBe("Tue 20 Oct");
  });
});

describe("?at and ?speed", () => {
  it("parses times", () => {
    expect(parseAt("18:49")).toEqual([18, 49, 0]);
    expect(parseAt("9:05")).toEqual([9, 5, 0]);
    expect(parseAt("18:11:25")).toEqual([18, 11, 25]);
    expect(parseAt("24:00")).toBeNull();
    expect(parseAt("18:60")).toBeNull();
    expect(parseAt("1849")).toBeNull();
    expect(parseAt("soon")).toBeNull();
  });

  it("?at=18:49 starts the clock on the event date", () => {
    const r = readRehearsal("?event=x&at=18:49", DOORS);
    expect(r.atMs).toBe(Date.parse("2026-10-20T18:49:00+02:00"));
    expect(r.speed).toBe(1);
    expect(r.warnings).toEqual([]);
  });

  it("?speed=10 runs ten times as fast", () => {
    const r = readRehearsal("?at=18:49&speed=10", DOORS);
    const loaded = 1_000_000;
    expect(clockNow(r, loaded, loaded)).toBe(r.atMs);
    expect(clockNow(r, loaded, loaded + 6_000)).toBe(r.atMs! + 60_000);
  });

  it("without ?at the clock is the real one, sped up if asked", () => {
    const r = readRehearsal("?speed=2", DOORS);
    expect(r.atMs).toBeNull();
    expect(clockNow(r, 5_000, 6_000)).toBe(7_000);
    expect(clockNow(readRehearsal("", DOORS), 5_000, 6_000)).toBe(6_000);
  });

  it("bad values are ignored with a warning", () => {
    const r = readRehearsal("?at=late&speed=-3", DOORS);
    expect(r.atMs).toBeNull();
    expect(r.speed).toBe(1);
    expect(r.warnings).toHaveLength(2);
    expect(readRehearsal("?speed=abc", DOORS).warnings).toHaveLength(1);
  });
});

describe("the rehearsal label (badge and tab title)", () => {
  it("is null on the real clock, so a real evening shows no badge", () => {
    expect(rehearsalLabel(readRehearsal("", DOORS))).toBeNull();
  });

  it("names the speed and the start time", () => {
    expect(rehearsalLabel(readRehearsal("?at=17:55&speed=10", DOORS))).toBe("rehearsal, 10x speed, from 17:55");
    expect(rehearsalLabel(readRehearsal("?speed=10", DOORS))).toBe("rehearsal, 10x speed");
    expect(rehearsalLabel(readRehearsal("?at=18:49", DOORS))).toBe("rehearsal, from 18:49");
  });
});

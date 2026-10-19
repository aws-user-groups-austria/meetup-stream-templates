/**
 * No long dashes anywhere: on screen, in sources, comments and tests. Time
 * ranges are "18:10-18:50", separators " - ". This fails on an en dash
 * (U+2013) or an em dash (U+2014) in any file under src/ or examples/, or in
 * the player's copy of the real event.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { localRange } from "./time";

const here = path.dirname(new URL(import.meta.url).pathname);
const LONG_DASH = new RegExp("[\\u2013\\u2014]");

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

describe("no long dashes", () => {
  it("none in src/, examples/ or the player's event file", () => {
    const files = [
      ...walk(here),
      ...walk(path.join(here, "..", "examples")),
      path.join(here, "..", "web-player", "public", "events", "2026-10-20-aws-meetup-vienna-53.json"),
    ].filter((f) => fs.existsSync(f) && /\.(ts|tsx|json|md)$/.test(f));
    const hits = files.flatMap((f) =>
      fs
        .readFileSync(f, "utf8")
        .split("\n")
        .flatMap((line, i) => (LONG_DASH.test(line) ? [`${path.relative(here, f)}:${i + 1}`] : [])),
    );
    expect(files.length).toBeGreaterThan(30);
    expect(hits).toEqual([]);
  });

  it("writes time ranges with a plain hyphen", () => {
    expect(localRange("2026-10-20T18:10:00+02:00", "2026-10-20T18:50:00+02:00")).toBe("18:10-18:50");
  });
});

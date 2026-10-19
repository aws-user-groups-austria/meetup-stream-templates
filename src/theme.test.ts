/**
 * Every scene and shared component takes its sizes and colours from
 * theme.ts: no numeric font size, no hex or rgb() colour literal anywhere
 * else in src/scenes or src/components.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AGENDA, COLLAGE_W, CONTENT_MAX, CONTENT_W, GRID, HEIGHT, LOGO, PHOTO, SPACE, SPLIT_GAP, STAGE_FILL, STAGE_FILL_FULL, STAGE_H, STAGE_H_FULL, TEAM, TYPE, WIDTH } from "./theme";

const here = path.dirname(new URL(import.meta.url).pathname);
const files = ["scenes", "components"].flatMap((dir) =>
  fs
    .readdirSync(path.join(here, dir))
    .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
    .map((f) => path.join(dir, f)),
);

const offending = (pattern: RegExp) =>
  files.flatMap((f) =>
    fs
      .readFileSync(path.join(here, f), "utf8")
      .split("\n")
      .map((line, i) => ({ where: `${f}:${i + 1}`, line: line.trim() }))
      .filter(({ line }) => !line.startsWith("*") && !line.startsWith("//") && pattern.test(line)),
  );

describe("one theme", () => {
  it("finds the scene and component files", () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it("has no literal font size outside theme.ts", () => {
    expect(offending(/fontSize\s*:\s*[0-9]/)).toEqual([]);
  });

  it("has no literal colour outside theme.ts", () => {
    expect(offending(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/)).toEqual([]);
  });

  it("spaces with the theme's tokens only: no pixel literals for gaps, margins or padding", () => {
    expect(offending(/\b(gap|margin\w*|padding\w*)\s*:\s*[1-9]/)).toEqual([]);
    expect(offending(/GRID\.step/)).toEqual([]);
  });

  it("puts no plate, card or box behind a logo", () => {
    const mark = fs.readFileSync(path.join(here, "components", "SponsorMark.tsx"), "utf8");
    expect(mark).not.toMatch(/\b(background\w*|border\w*|boxShadow|padding\w*)\s*:/);
  });

  it("has no literal photo size outside theme.ts", () => {
    expect(offending(/<Avatar[^>]*size=\{\s*\d/)).toEqual([]);
  });

  it("is the scale and grid of the spec", () => {
    expect(Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [k, v.size]))).toEqual({
      display: 136,
      title: 96,
      heading: 68,
      lead: 56,
      body: 42,
      small: 34,
      label: 28,
    });
    expect(PHOTO).toMatchObject({ xl: 360, l: 280, m: 200, team: 160, s: 96, ring: 6 });
    expect(LOGO).toEqual({ header: 88, hostBar: 48, hostSponsor: 160, group: 280 });
    expect(GRID).toMatchObject({ side: 112, gutter: 48, bandTop: 72, bandBottom: 192, barTop: 984, barH: 96 });
    expect(Object.values(SPACE)).toEqual([8, 16, 24, 32, 48, 64, 96, 128]);
    expect(CONTENT_MAX).toBeLessThanOrEqual(1504);
    expect(STAGE_H - STAGE_FILL).toBe(128);
    expect(STAGE_H_FULL - STAGE_FILL_FULL).toBe(128);
    expect(GRID.barTop + GRID.barH).toBe(HEIGHT);
    expect(WIDTH).toBe(1920);
  });

  it("spaces the layout tokens on the grid", () => {
    const steps: number[] = Object.values(SPACE);
    for (const v of [SPLIT_GAP, TEAM.gap, TEAM.colGap, TEAM.rowGap, AGENDA.padX, AGENDA.padY, AGENDA.colGap]) expect(steps).toContain(v);
    // The collage and the team grid leave their text column room on the stage.
    expect(CONTENT_W - COLLAGE_W - SPLIT_GAP).toBeGreaterThanOrEqual(CONTENT_W / 2 - SPLIT_GAP);
    expect(2 * (PHOTO.team + TYPE.body.size * TYPE.body.lineHeight + 2 * TYPE.small.size * TYPE.small.lineHeight + SPACE.md) + TEAM.rowGap).toBeLessThanOrEqual(STAGE_H - SPACE.x2);
  });
});

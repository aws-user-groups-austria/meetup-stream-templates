import { describe, expect, it } from "vitest";
import { INTRO_FRAMES, LOOP_FRAMES } from "../../src/theme";
import { sceneFrame } from "./loop";

const HOLD = INTRO_FRAMES + LOOP_FRAMES;

describe("holding a scene", () => {
  it("plays the entrance once, then loops from loopFrom without touching the entrance again", () => {
    expect(sceneFrame(0, HOLD, INTRO_FRAMES)).toBe(0);
    expect(sceneFrame(HOLD - 1, HOLD, INTRO_FRAMES)).toBe(HOLD - 1);
    expect(sceneFrame(HOLD, HOLD, INTRO_FRAMES)).toBe(INTRO_FRAMES);
    expect(sceneFrame(HOLD + 1, HOLD, INTRO_FRAMES)).toBe(INTRO_FRAMES + 1);
    // Two hours of closing, at 30 fps.
    const f = sceneFrame(2 * 60 * 60 * 30, HOLD, INTRO_FRAMES);
    expect(f).toBeGreaterThanOrEqual(INTRO_FRAMES);
    expect(f).toBeLessThan(HOLD);
  });

  it("PreShow loops from frame 0", () => {
    expect(sceneFrame(LOOP_FRAMES, LOOP_FRAMES, 0)).toBe(0);
    expect(sceneFrame(LOOP_FRAMES * 3 + 7, LOOP_FRAMES, 0)).toBe(7);
  });

  it("a scene with nothing to loop holds its last frame", () => {
    expect(sceneFrame(10, 1, 1)).toBe(0);
  });
});

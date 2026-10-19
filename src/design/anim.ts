/**
 * Entrance motion as a function of the frame. Nothing here reads a clock.
 */
import type { CSSProperties } from "react";
import { interpolate, spring } from "remotion";
import { FPS } from "../theme";

/** Frames between staggered elements. */
export const STAGGER = 5;

/** 0 to 1 over about 0.8 s, starting at `delay`, no overshoot. */
export const progress = (frame: number, delay = 0): number =>
  spring({ frame: frame - delay, fps: FPS, config: { damping: 200, mass: 0.8 }, durationInFrames: 24 });

/** Fade and rise in. `still` renders the settled state (for a 1-frame Still). */
export const enterStyle = (frame: number, delay = 0, distance = 36, still = false): CSSProperties => {
  if (still) return {};
  const p = progress(frame, delay);
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
};

/** Fade out over the last `frames` frames before `end`. */
export const exitOpacity = (frame: number, end: number, frames = 18): number =>
  interpolate(frame, [end - frames, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/**
 * Two views taking turns in a scene's hold loop: the first from the start
 * (with its entrance) and for the first half of the hold, the second for the
 * second half. Returns the second view's opacity; the first is 1 minus it.
 * It is 0 again at the loop's last frame, so the wrap back to the first
 * frame of the hold is seamless.
 */
export const secondViewOpacity = (frame: number, introFrames: number, loopFrames: number, fade = 24): number => {
  const start = introFrames + loopFrames / 2;
  const end = introFrames + loopFrames;
  return interpolate(frame, [start, start + fade, end - fade, end - 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

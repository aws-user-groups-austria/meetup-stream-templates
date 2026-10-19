/**
 * How a scene holds on screen: the Player counts frames up for hours, the
 * scene plays frames 0..durationInFrames-1 once (its entrance and first
 * loop), then repeats [loopFrom, durationInFrames) for as long as it is up.
 * Pure, so it is tested without a browser.
 */
export const sceneFrame = (f: number, durationInFrames: number, loopFrom: number): number => {
  if (f < durationInFrames) return f;
  const period = durationInFrames - loopFrom;
  return period > 0 ? loopFrom + ((f - loopFrom) % period) : durationInFrames - 1;
};

/**
 * The player's own screens (help overlay, error screens, the link group) in
 * the theme of the scenes: the same font, colours and type tokens, scaled to
 * the window (a token's px is for a 1920 px wide screen; on a laptop window
 * it shrinks with the width, never below half).
 */
import type { CSSProperties } from "react";
import { COLORS, FONT, MONO, TYPE, WIDTH, type TypeName, type as frameType } from "../../src/theme";

export { COLORS as C, FONT };

/** A theme type token at window scale. */
export const chrome = (name: TypeName, weight?: number): CSSProperties => {
  const t = TYPE[name];
  return {
    ...frameType(name, weight),
    fontFamily: FONT,
    fontSize: `clamp(${Math.round(t.size / 2)}px, ${((t.size / WIDTH) * 100).toFixed(3)}vw, ${t.size}px)`,
  };
};

/** Monospace (keys, schema paths) at a token's window-scaled size. */
export const mono = (name: TypeName): CSSProperties => ({ ...chrome(name), fontFamily: MONO, textTransform: "none", letterSpacing: 0 });

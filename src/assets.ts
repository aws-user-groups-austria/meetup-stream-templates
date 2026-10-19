/**
 * Image paths in event.json (speaker photos, sponsor logos) are either full
 * URLs or paths relative to the public folder. Full URLs, data URLs and
 * root-relative paths pass through; anything else goes through staticFile(),
 * which the web player points at its own folder via window.remotion_staticBase.
 */
import { staticFile } from "remotion";

export const resolveAsset = (src: string): string =>
  /^(https?:|data:|blob:|\/)/.test(src) ? src : staticFile(src.replace(/^\.\//, ""));

export const LOGOS = {
  ugVienna: () => staticFile("assets/logos/ug-vienna-logo-trimmed.png"),
  /** The user group's hexagon alone, square, for the bottom bar's round marker. */
  ugViennaMarker: () => staticFile("assets/logos/ug-vienna-marker.png"),
} as const;


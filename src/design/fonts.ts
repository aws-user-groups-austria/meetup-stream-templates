/**
 * The theme's fonts: Amazon Ember, then Inter.
 *
 * Amazon Ember may be used but its files are never committed or published.
 * Each weight is a FontFace whose sources are the installed font first
 * (`local(...)`), then the gitignored file in public/fonts/amazon-ember/
 * (filled by `make fonts`). The web player's production build leaves those
 * files out and sets `window.meetupFontFiles = false`, so the page served from
 * the website only ever asks for the installed font.
 *
 * Inter (public/fonts, OFL) is always registered as the fallback, so a
 * missing Ember never takes the screen down: a render waits for both
 * (delayRender), logs one warning when Ember is not there, and carries on.
 */
import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

declare global {
  interface Window {
    /** false: do not request font files, only installed fonts (the website build). */
    meetupFontFiles?: boolean;
  }
}

const EMBER: { weight: string; local: string[]; file: string; format: string }[] = [
  { weight: "400", local: ["Amazon Ember", "AmazonEmber-Regular", "Amazon Ember Regular"], file: "amazon-ember-400.woff2", format: "woff2" },
  { weight: "500", local: ["Amazon Ember Medium", "AmazonEmber-Medium", "Amazon-Ember-Medium"], file: "amazon-ember-500.ttf", format: "truetype" },
  { weight: "700", local: ["Amazon Ember Bold", "AmazonEmber-Bold"], file: "amazon-ember-700.woff2", format: "woff2" },
  { weight: "800", local: ["Amazon Ember Heavy", "AmazonEmber-Heavy"], file: "amazon-ember-800.woff2", format: "woff2" },
];

const LATIN_EXT = "U+0100-024F, U+1E00-1EFF";

/**
 * Inter: each latin-ext face is registered with exactly the same weight as a
 * latin face. With a weight range instead ("700 900"), Chrome picks the ext
 * face as the best match for 900, finds no Latin glyphs in it (unicode-range)
 * and falls through to Arial. Identical descriptors make one composite face.
 */
const INTER: { file: string; weight: string; unicodeRange?: string }[] = [
  ...["400", "500", "600", "700", "800", "900"].map((weight) => ({ file: `inter-latin-${weight}-normal.woff2`, weight })),
  ...["400", "500", "600"].map((weight) => ({ file: "inter-latin-ext-400-normal.woff2", weight, unicodeRange: LATIN_EXT })),
  ...["700", "800", "900"].map((weight) => ({ file: "inter-latin-ext-700-normal.woff2", weight, unicodeRange: LATIN_EXT })),
];

/** The `src` of one Ember weight: installed names first, then the file unless files are off. */
export const emberSource = (face: (typeof EMBER)[number], url: string | null): string =>
  [...face.local.map((n) => `local("${n}")`), ...(url ? [`url("${url}") format("${face.format}")`] : [])].join(", ");

let started = false;

/** Resolves to whether Amazon Ember Bold is on screen (installed or loaded from the files). */
let emberReady: Promise<boolean> = Promise.resolve(false);
let emberKnown: boolean | null = null;

const loadEmber = async (): Promise<boolean> => {
  const files = typeof window === "undefined" || window.meetupFontFiles !== false;
  const results = await Promise.allSettled(
    EMBER.map(async (face) => {
      const ff = new FontFace("Amazon Ember", emberSource(face, files ? staticFile(`fonts/amazon-ember/${face.file}`) : null), {
        weight: face.weight,
        style: "normal",
      });
      await ff.load();
      document.fonts.add(ff);
    }),
  );
  const missing = results.filter((r) => r.status === "rejected").length;
  if (missing) console.warn(`[fonts] Amazon Ember: ${missing} of ${EMBER.length} weights not available, using Inter for them (make fonts, or install Amazon Ember)`);
  // Bold is the weight the one-line decisions are measured in.
  return results[EMBER.findIndex((f) => f.weight === "700")]?.status === "fulfilled";
};

/** Idempotent; a no-op outside a browser (unit tests import the scene registry). */
export const loadFonts = (): void => {
  if (started || typeof document === "undefined") return;
  started = true;
  for (const face of INTER) {
    loadFont({
      family: "Inter",
      url: staticFile(`fonts/${face.file}`),
      weight: face.weight,
      ...(face.unicodeRange ? { unicodeRange: face.unicodeRange } : {}),
    }).catch((err: unknown) => {
      console.warn(`[fonts] could not load ${face.file}:`, err);
    });
  }
  const handle = delayRender("Amazon Ember");
  emberReady = loadEmber()
    .catch(() => false)
    .then((ok) => {
      emberKnown = ok;
      return ok;
    })
    .finally(() => continueRender(handle));
};

/**
 * Whether Amazon Ember is the face on screen, for measuring text with its
 * real widths. A render waits (delayRender) until that is known, so a still
 * is laid out for the font it is drawn in. Outside a browser (unit tests,
 * server markup) it says true: the layout for Amazon Ember.
 */
export const useEmber = (): boolean => {
  const [ember, setEmber] = useState<boolean>(emberKnown ?? true);
  useEffect(() => {
    if (emberKnown !== null) {
      setEmber(emberKnown);
      return;
    }
    const handle = delayRender("Amazon Ember metrics");
    let live = true;
    emberReady.then((ok) => {
      if (live) setEmber(ok);
      continueRender(handle);
    });
    return () => {
      live = false;
    };
  }, []);
  return ember;
};

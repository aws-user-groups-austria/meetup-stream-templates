/**
 * The one theme of the stream: every scene, every shared component and the
 * web player's own chrome take their sizes, colours and fonts from here and
 * nowhere else (src/theme.test.ts checks the scene and component files for
 * literal font sizes and colours). Values from ../SPEC.md, "Theme: one design
 * for everything". Pixels on the 1920x1080 frame.
 */
import type { CSSProperties } from "react";

// ------------------------------------------------------------------ frame

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;

/** Frames the entrance animations take before a scene is settled. */
export const INTRO_FRAMES = 60;
/**
 * Length of one hold loop. The background, the pre-show panels and the
 * two-view holds (Welcome, Break) are periodic in it, so a player looping
 * [INTRO_FRAMES, end) has no visible jump at the wrap.
 */
export const LOOP_FRAMES = 1800;
/** The PreShow loop: two hold loops, so up to seven panels get about 17 s each. */
export const PRESHOW_FRAMES = LOOP_FRAMES * 2;

// ------------------------------------------------------------------ font

/** Amazon Ember (installed, or the gitignored files in public/fonts/amazon-ember), then Inter. */
export const FONT = "'Amazon Ember', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
export const MONO = "ui-monospace, Menlo, monospace";

export const WEIGHT = { regular: 400, medium: 500, bold: 700, heavy: 800 } as const;

type TypeToken = { size: number; weight: number; lineHeight: number; upper?: true };

/** The type scale. One Display per screen; nothing on screen is smaller than Label. */
export const TYPE = {
  display: { size: 136, weight: WEIGHT.heavy, lineHeight: 1.02 },
  title: { size: 96, weight: WEIGHT.bold, lineHeight: 1.08 },
  heading: { size: 68, weight: WEIGHT.bold, lineHeight: 1.12 },
  lead: { size: 56, weight: WEIGHT.regular, lineHeight: 1.2 },
  body: { size: 42, weight: WEIGHT.regular, lineHeight: 1.3 },
  small: { size: 34, weight: WEIGHT.medium, lineHeight: 1.3 },
  label: { size: 28, weight: WEIGHT.bold, lineHeight: 1.2, upper: true },
} as const satisfies Record<string, TypeToken>;

export type TypeName = keyof typeof TYPE;

/** Overlines are upper case with 0.12 em tracking. */
export const LABEL_TRACKING = "0.12em";

/** The CSS for a type token; `weight` overrides the token's own (e.g. a bold Body line). */
export const type = (name: TypeName, weight?: number): CSSProperties => {
  const t: TypeToken = TYPE[name];
  return {
    fontSize: t.size,
    fontWeight: weight ?? t.weight,
    lineHeight: t.lineHeight,
    ...(t.upper ? { textTransform: "uppercase" as const, letterSpacing: LABEL_TRACKING } : {}),
  };
};

/**
 * Average glyph width in em, conservative across Amazon Ember (measured: Bold
 * 0.50 to 0.56) and the Inter fallback, for the text-fitting estimates.
 */
export const CHAR_W = 0.56;

// ------------------------------------------------------------------ colour

export const COLORS = {
  bg: "#161E2D",
  surface: "#1E2538",
  surface2: "#2F2B52",
  surface3: "#0F1520",
  accent: "#A66FF0",
  text: "#FFFFFF",
  secondary: "#D8D8D8",
  muted: "#9CA3AF",
  /** QR codes: dark modules on white. */
  qrDark: "#161E2D",
  qrLight: "#FFFFFF",
  /** Translucent tints for glass cards, rings and glows. */
  accentDim: "rgba(166, 111, 240, 0.12)",
  accentSoft: "rgba(166, 111, 240, 0.18)",
  accentGlow: "rgba(166, 111, 240, 0.25)",
  border: "rgba(166, 111, 240, 0.28)",
  glass: "rgba(30, 37, 56, 0.78)",
  glassDeep: "rgba(15, 21, 32, 0.6)",
  hairline: "rgba(255, 255, 255, 0.08)",
  shade: "rgba(8, 11, 18, 0.55)",
  overlay: "rgba(10, 14, 24, 0.92)",
  warning: "#F5B971",
  black: "#000000",
} as const;

/** The background's moving glows, as an rgba() with a frame-driven alpha. */
export const glow = {
  accent: (alpha: number): string => `rgba(166, 111, 240, ${alpha.toFixed(3)})`,
  deep: (alpha: number): string => `rgba(47, 43, 82, ${alpha.toFixed(3)})`,
  floor: "#131A28",
  vignette: "rgba(8, 11, 18, 0.55)",
  clear: "rgba(0, 0, 0, 0)",
} as const;

/**
 * The bottom bar, after the GameDay talk deck's phase bar. Its type is the
 * documented exception to the Label minimum: like the deck's phase bar it is
 * chrome, read at a glance, not content.
 */
export const BAR = {
  /** "Now", "hosted by", the part names above the rail. */
  label: 16,
  labelTracking: "0.18em",
  /** The current part's name. */
  value: 26,
  /** The host logo. */
  logo: 28,
  /** The round marker on the rail. */
  marker: 36,
  rail: 4,
  tick: 16,
  /** The "Now" column and the host column. */
  nowW: 300,
  hostW: 240,
  /** Between the three columns. */
  gap: 36,
  /** Between a bar label and its value. */
  inner: 4,
  background: "rgba(12, 16, 28, 0.88)",
  rule: "rgba(255, 255, 255, 0.08)",
  railColor: "rgba(255, 255, 255, 0.14)",
  tickColor: "rgba(255, 255, 255, 0.22)",
  fill: "linear-gradient(90deg, #6D3FD6, #A66FF0)",
  fillGlow: "rgba(166, 111, 240, 0.5)",
  markerRing: "rgba(255, 255, 255, 0.6)",
  hostOpacity: 0.85,
} as const;

// ------------------------------------------------------------------ grid

/** 112 px side margins, the logo band at the top, the bottom bar from y 984. */
export const GRID = {
  side: 112,
  gutter: 48,
  /** The top band, 72 to 192: the logos sit in it, centred. */
  bandTop: 72,
  bandBottom: 192,
  barTop: 984,
  barH: 96,
} as const;

/** Spacing: every gap, margin and padding is one of these. */
export const SPACE = { xs: 8, sm: 16, md: 24, lg: 32, xl: 48, x2: 64, x3: 96, x4: 128 } as const;

/** Between content groups (title block, card, supporting line): never less. */
export const GROUP_GAP = SPACE.x2;

/**
 * The stage: where scene content goes, between the logo band and the bar
 * (or the bottom margin on Welcome and AfterEnd). Content is centred in it
 * vertically and leaves at least SPACE.x4 of it empty.
 */
export const STAGE = { top: GRID.bandBottom, bottom: GRID.barTop, bottomFull: HEIGHT - SPACE.x3 } as const;
export const STAGE_H = STAGE.bottom - STAGE.top;
export const STAGE_H_FULL = STAGE.bottomFull - STAGE.top;
/** The most a stage's content may take, so there is always room above and below it. */
export const STAGE_FILL = STAGE_H - SPACE.x4;
export const STAGE_FILL_FULL = STAGE_H_FULL - SPACE.x4;

/** The widest a block of text runs; two-column layouts may use the full CONTENT_W. */
export const CONTENT_MAX = 1504;
export const CONTENT_W = WIDTH - GRID.side * 2;

export const RADIUS = { sm: 8, md: 16, lg: 24, xl: 32, pill: 999 } as const;

// ------------------------------------------------------------------ images

/**
 * Round speaker photos with a 6 px accent ring: XL one speaker, L two, M
 * three or more and the community day's speakers, team the six cards on
 * "Who we are" (two rows beside the page head), S the speakers in a list.
 */
export const PHOTO = { xl: 360, l: 280, m: 200, team: 160, s: 96, ring: 6 } as const;

/** Logo heights: the user group in the top band, the host in the bar and on the sponsor screen, the groups on "What we do". */
export const LOGO = { header: 88, hostBar: 48, hostSponsor: 160, group: 280 } as const;

/** The member badges on "Introducing our members". */
export const BADGE = 200;

/** The hexagon photo collage of past meetups, the visual of Welcome and AfterEnd (width; the height follows the file, 2048 x 1358). */
export const COLLAGE_W = 800;
export const COLLAGE_ASPECT = 2048 / 1358;

/**
 * Two-column screens: the text column on the left, the visual (photos, a
 * QR, the collage) on the right, both centred in the stage, this far apart.
 */
export const SPLIT_GAP = SPACE.x3;

/** "Who we are": the page head's column beside the 3 x 2 team grid, the gap between them, and the grid's gaps. */
export const TEAM = { headW: 400, gap: SPACE.x2, colGap: SPACE.md, rowGap: SPACE.lg } as const;

/**
 * The one agenda (AgendaList): the time column, each row's padding, the
 * accent bar of the current row. Rows at Body, or Small when Body does not
 * fit; the speakers of a talk in Small under its title.
 */
export const AGENDA = { timeEm: 3.2, padX: SPACE.lg, padY: SPACE.xs, colGap: SPACE.xl, bar: SPACE.xs - 2 } as const;

/** QR codes: feedback (L), the event page (M), a community day's site (S). */
export const QR = { l: 320, m: 256, s: 200, pad: 16 } as const;

/** Width / height of the trimmed AWS User Group Vienna logo. */
export const UG_VIENNA_ASPECT = 1900 / 860;

/** At most `lines` lines of text, ending in an ellipsis: long names and roles never push a card into the bar. */
export const clampLines = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

/**
 * The countdown top right, in the logo band where the AWS Community Austria
 * logo was: a small upper-case label over the value. Like the bar it is
 * chrome, so its label may be smaller than Label.
 */
export const COUNTDOWN = {
  label: 16,
  labelTracking: "0.18em",
  value: 44,
  inner: 4,
} as const;

// ------------------------------------------------------------------ the meetup page's header

/**
 * Links on the meetup page's header (embed mode only; components/Linked.tsx).
 * Frame px: the header is about 535 px wide on a desktop and 360 px on a
 * phone, a third and a fifth of the frame, so the ring is thick enough to
 * read there (6 px on the frame is 1.7 px at 535). On hover: an accent ring
 * a little outside the element, a soft tint inside it, a small lift.
 */
export const LINK = {
  ring: 6,
  /** The tinted gap between the element and its ring (none in a list, where it would cover the next row). */
  offset: SPACE.sm,
  offsetTight: 0,
  lift: 6,
  glow: SPACE.x2,
  /** ms */
  ease: 160,
} as const;

/**
 * "Our meetups" (one row of large cards) and "Our hosts and sponsors" (a
 * calm grid). Every host logo sits on the same light plate, in the colours
 * made for a light background (archive.json hosts[].plateLogo), so a dark or
 * coloured logo reads as well as a white one.
 */
export const ARCHIVE = {
  cardGap: SPACE.lg,
  cardPad: SPACE.lg,
  /** The plate on a meetup card, and the logo's box inside it. */
  cardPlateH: 168,
  cardLogoH: 88,
  hostCols: 4,
  hostColGap: SPACE.xl,
  hostRowGap: SPACE.xl,
  hostPlateH: 140,
  hostLogoH: 72,
  /** The logo's share of the plate's width, at most. */
  logoW: 0.72,
  plate: "#F7F7FA",
  plateText: "#161E2D",
} as const;

/** "What we do": each group on a card of its own, its logo with the QR code to its Meetup page beside it. */
export const GROUPS = { logo: 150, qr: 136, gap: SPACE.md, pad: SPACE.lg, cardGap: SPACE.xl } as const;

/**
 * A community day (UpcomingBody: the Upcoming scene, the pre-show panel, the
 * Break's second view, the header's CommunityDay screens): its website's
 * screenshot in a browser-like card (16:9, an address bar with the url), a
 * QR code to the site on a white sticker over the card's corner, and the
 * name, day, place and speakers beside it.
 */
export const DAY = {
  shotW: 720,
  /** The card's address bar. */
  barH: 56,
  barDot: 12,
  qr: 168,
  /** How far the QR sticker sits out over the card's corner. */
  qrOut: SPACE.lg,
  colGap: SPACE.x3,
} as const;

/**
 * The tour's own chrome, drawn by the player over the scene (Embed.tsx):
 * window px, since the header is small. The progress line along the top
 * edge, the dots (one per screen, the current one long) and the pill.
 */
export const TOUR_UI = {
  progress: 3,
  dot: 6,
  dotOn: 18,
  dotGap: 5,
  /** The dots' hit area, larger than the dot. */
  dotHit: 14,
  /** Pill text, min / preferred (vw) / max. */
  pillMin: 10,
  pillVw: 2.1,
  pillMax: 13,
  /** Crossfade between two screens, ms. */
  fadeMs: 450,
  progressTrack: "rgba(255, 255, 255, 0.10)",
  pillBg: "rgba(12, 16, 28, 0.72)",
} as const;

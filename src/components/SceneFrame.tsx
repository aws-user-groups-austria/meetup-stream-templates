/**
 * The broadcast chrome, the same on every scene: the moving background, the
 * AWS User Group Vienna logo top left (88 px, centred in the top band), the
 * countdown top right, the stage on the 112 px grid, and the bottom bar.
 *
 * The stage runs from the logo band to the bar; its content is centred
 * vertically, so the empty space sits above and below it.
 */
import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { LOGOS } from "../assets";
import { loadFonts } from "../design/fonts";
import type { EventFile } from "../event.schema";
import { COLORS, CONTENT_W, FONT, GRID, LOGO, STAGE, STAGE_H, STAGE_H_FULL, UG_VIENNA_ASPECT } from "../theme";
import { Background } from "./Background";
import { BottomBar } from "./BottomBar";
import { Enter } from "./Enter";
import { TopCountdown } from "./TopCountdown";
import { useEmbed } from "../embed";

loadFonts();

const LOGO_TOP = GRID.bandTop + (GRID.bandBottom - GRID.bandTop - LOGO.header) / 2;

/** Enter's place in the header: the same box, no motion. */
const Still: React.FC<{ distance?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => <div style={style}>{children}</div>;

export const SceneFrame: React.FC<{
  /** The bottom bar: the event and the segment that is on (lit in the chapters). Omit on Welcome and AfterEnd. */
  bar?: { event: EventFile; currentId?: string; showNext?: boolean };
  /** The part the scene is about, for the countdown's static value (defaults to the bar's). */
  segmentId?: string;
  /** The event, for the countdown on scenes without the bar (Welcome, AfterEnd). */
  event?: EventFile;
  children: React.ReactNode;
}> = ({ bar, segmentId, event, children }) => {
  const countdownEvent = bar?.event ?? event;
  // On the meetup page's header the chrome is already there: the tour crossfades between
  // screens, and a logo and countdown that faded in again on every screen would blink.
  const settled = useEmbed() !== null;
  const Chrome = settled ? Still : Enter;
  return (
  <AbsoluteFill style={{ fontFamily: FONT, color: COLORS.text, backgroundColor: COLORS.bg }}>
    <Background />
    <Chrome distance={-16} style={{ position: "absolute", top: LOGO_TOP, left: GRID.side }}>
      <Img data-logo="ug-vienna" src={LOGOS.ugVienna()} style={{ display: "block", height: LOGO.header, width: LOGO.header * UG_VIENNA_ASPECT }} />
    </Chrome>
    {countdownEvent ? (
      <Chrome
        distance={-16}
        style={{ position: "absolute", top: GRID.bandTop, height: GRID.bandBottom - GRID.bandTop, right: GRID.side, display: "flex", alignItems: "center" }}
      >
        <TopCountdown event={countdownEvent} segmentId={segmentId ?? bar?.currentId} />
      </Chrome>
    ) : null}
    <div
      data-stage=""
      style={{
        position: "absolute",
        top: STAGE.top,
        left: GRID.side,
        width: CONTENT_W,
        height: bar ? STAGE_H : STAGE_H_FULL,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
    {bar ? <BottomBar event={bar.event} currentId={bar.currentId} showNext={bar.showNext} /> : null}
  </AbsoluteFill>
  );
};

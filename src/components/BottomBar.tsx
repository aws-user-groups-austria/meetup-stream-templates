/**
 * The bottom bar, after the GameDay talk deck's phase bar
 * (automating-the-chaos-talk: SlideFrame.tsx PhaseBar, deck.css .phasebar):
 * a 96 px dark translucent band with a 1 px top rule, the same on every
 * scene but Welcome and AfterEnd.
 *
 *   left   "Now" and the current part's short name
 *   middle the track: one equal-width segment per part of the evening, a
 *          4 px rail, the accent fill up to now, ticks between segments, the
 *          part names above the rail, the user group's round marker at the
 *          exact position
 *   right  "hosted by" and the host's logo (or name)
 *
 * The position comes from the live clock in the web player and is the middle
 * of the current part in Studio and renders. In the player every segment is
 * clickable (goToSegment from the LiveClock context) and jumps to the start
 * of that part; elsewhere the bar is plain chrome.
 */
import React, { useState } from "react";
import { Img } from "remotion";
import { LOGOS, resolveAsset } from "../assets";
import { useLiveClock } from "../clock";
import type { EventFile } from "../event.schema";
import { chapters, hostOf } from "../model";
import { BAR, COLORS, GRID, RADIUS, WIDTH } from "../theme";
import { urlHref } from "../embed";
import { Linked } from "./Linked";

/**
 * Where the marker is, in percent of the track: the segment of `currentId`
 * (or, with a live clock, the segment `nowMs` falls in) plus how far into
 * it. Without a clock, the middle of the current part.
 */
export const trackPercent = (event: EventFile, currentId: string | undefined, nowMs: number | null): number => {
  const segs = event.segments;
  if (segs.length === 0) return 0;
  const segW = 100 / segs.length;
  if (nowMs !== null) {
    if (nowMs < Date.parse(segs[0]!.start)) return 0;
    if (nowMs >= Date.parse(segs[segs.length - 1]!.end)) return 100;
    let k = segs.findIndex((s) => nowMs >= Date.parse(s.start) && nowMs < Date.parse(s.end));
    // In a gap between parts the marker waits at the end of the last one.
    if (k === -1) k = Math.max(0, segs.filter((s) => Date.parse(s.end) <= nowMs).length - 1);
    const s = segs[k]!;
    const frac = Math.min(1, Math.max(0, (nowMs - Date.parse(s.start)) / (Date.parse(s.end) - Date.parse(s.start))));
    return k * segW + frac * segW;
  }
  const k = segs.findIndex((s) => s.id === currentId);
  return k === -1 ? 0 : k * segW + 0.5 * segW;
};

const labelStyle: React.CSSProperties = {
  fontSize: BAR.label,
  fontWeight: 700,
  letterSpacing: BAR.labelTracking,
  textTransform: "uppercase",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

/** The rail sits low in the track; the labels above it. */
const TRACK_H = 70;
const RAIL_TOP = 46;

const Segment: React.FC<{
  id: string;
  label: string;
  left: number;
  width: number;
  state: "on" | "done" | "";
  onGo?: (id: string) => void;
}> = ({ id, label, left, width, state, onGo }) => {
  const [hover, setHover] = useState(false);
  const color = state === "on" || hover ? COLORS.text : state === "done" ? COLORS.accent : COLORS.muted;
  return (
    <div
      data-chapter={id}
      data-current={state === "on" ? "" : undefined}
      onClick={
        onGo
          ? (e) => {
              e.stopPropagation();
              onGo(id);
            }
          : undefined
      }
      onMouseEnter={onGo ? () => setHover(true) : undefined}
      onMouseLeave={onGo ? () => setHover(false) : undefined}
      style={{ position: "absolute", top: 0, height: TRACK_H, left: `${left}%`, width: `${width}%`, cursor: onGo ? "pointer" : undefined }}
    >
      <span
        style={{
          ...labelStyle,
          position: "absolute",
          top: 2,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          color,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const BottomBar: React.FC<{ event: EventFile; currentId?: string; showNext?: boolean }> = ({ event, currentId }) => {
  const { goToSegment, nowMs } = useLiveClock();
  const host = hostOf(event);
  const parts = chapters(event);
  const currentIndex = parts.findIndex((c) => c.id === currentId);
  const percent = trackPercent(event, currentId, nowMs);
  // A still about no part in particular (the deck's agenda) has no position to mark.
  const placed = currentIndex >= 0 || nowMs !== null;
  const segW = 100 / Math.max(1, parts.length);
  const passThrough: React.CSSProperties = goToSegment ? { pointerEvents: "none" } : {};
  return (
    <div
      data-bar=""
      data-nav={goToSegment ? "" : undefined}
      style={{
        position: "absolute",
        left: 0,
        top: GRID.barTop,
        width: WIDTH,
        height: GRID.barH,
        boxSizing: "border-box",
        padding: `0 ${GRID.side}px`,
        background: BAR.background,
        borderTop: `1px solid ${BAR.rule}`,
        display: "grid",
        gridTemplateColumns: `${BAR.nowW}px 1fr ${BAR.hostW}px`,
        alignItems: "center",
        gap: BAR.gap,
      }}
    >
      <div data-bar-now="" style={{ minWidth: 0 }}>
        <div style={{ ...labelStyle, color: COLORS.accent }}>Now</div>
        <div style={{ fontSize: BAR.value, fontWeight: 800, lineHeight: 1.2, marginTop: BAR.inner, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {currentIndex >= 0 ? parts[currentIndex]!.label : "Tonight"}
        </div>
      </div>
      <div data-track="" style={{ position: "relative", height: TRACK_H }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: RAIL_TOP, height: BAR.rail, borderRadius: BAR.rail / 2, background: BAR.railColor }} />
        <div
          data-fill=""
          style={{
            ...passThrough,
            position: "absolute",
            left: 0,
            top: RAIL_TOP,
            height: BAR.rail,
            borderRadius: BAR.rail / 2,
            width: `${percent}%`,
            background: BAR.fill,
            boxShadow: `0 0 12px ${BAR.fillGlow}`,
          }}
        />
        {parts.map((c, i) => (
          <React.Fragment key={c.id}>
            <Segment
              id={c.id}
              label={c.label}
              left={i * segW}
              width={segW}
              state={i === currentIndex ? "on" : currentIndex >= 0 && i < currentIndex ? "done" : ""}
              onGo={goToSegment}
            />
            {i > 0 ? (
              <div style={{ ...passThrough, position: "absolute", top: RAIL_TOP + BAR.rail / 2 - BAR.tick / 2, left: `${i * segW}%`, width: 2, height: BAR.tick, background: BAR.tickColor }} />
            ) : null}
          </React.Fragment>
        ))}
        {placed ? (
        <Img
          data-marker=""
          src={LOGOS.ugViennaMarker()}
          style={{
            ...passThrough,
            position: "absolute",
            top: RAIL_TOP + BAR.rail / 2 - BAR.marker / 2,
            left: `${percent}%`,
            width: BAR.marker,
            height: BAR.marker,
            marginLeft: -BAR.marker / 2,
            borderRadius: "50%",
            objectFit: "cover",
            boxShadow: `0 0 0 2px ${BAR.markerRing}, 0 0 22px ${COLORS.accentGlow}`,
          }}
        />
        ) : null}
      </div>
      <div data-bar-host="" style={{ minWidth: 0, opacity: BAR.hostOpacity, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: BAR.inner }}>
        {host ? (
          <Linked to={event.sponsors[0]?.url ? (embed) => urlHref(embed, event.sponsors[0]!.url!) : null} label={`${host.name}: website`} radius={RADIUS.sm} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: BAR.inner }}>
            <div style={{ fontSize: BAR.label, fontWeight: 500, lineHeight: 1.2, color: COLORS.muted, whiteSpace: "nowrap" }}>hosted by</div>
            {host.logo ? (
              <Img data-host-logo={host.logo} src={resolveAsset(host.logo)} style={{ display: "block", height: BAR.logo, maxWidth: BAR.hostW, objectFit: "contain", objectPosition: "right center" }} />
            ) : (
              <div data-host-name="" style={{ fontSize: BAR.label, fontWeight: 700, lineHeight: 1.2, color: COLORS.text, maxWidth: BAR.hostW, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {host.name}
              </div>
            )}
          </Linked>
        ) : null}
      </div>
    </div>
  );
};

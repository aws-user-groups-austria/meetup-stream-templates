/**
 * The countdown top right (see ../countdown.ts): a small upper-case label and
 * the value. Live from the player's clock, against the event as published
 * (LiveClock.schedule), so stepping and the delay keys leave it alone. In
 * Studio and renders, the value at the start of the scene's part. With
 * LiveClock.fixedCountdown (the meetup page's header), that one instead.
 */
import React from "react";
import { useLiveClock } from "../clock";
import { countdownAt, formatTicking } from "../countdown";
import type { EventFile } from "../event.schema";
import { COLORS, COUNTDOWN } from "../theme";

export const TopCountdown: React.FC<{ event: EventFile; segmentId?: string }> = ({ event, segmentId }) => {
  const { nowMs, schedule, fixedCountdown } = useLiveClock();
  const published = schedule ?? event;
  const at = segmentId ? published.segments.find((s) => s.id === segmentId)?.start : undefined;
  const now = nowMs ?? Date.parse(at ?? published.doorsOpen);
  const c = fixedCountdown
    ? { label: fixedCountdown.label, value: formatTicking(fixedCountdown.targetMs - now) }
    : countdownAt(published, now);
  if (!c) return null;
  return (
    <div data-countdown-top={c.label} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: COUNTDOWN.inner }}>
      <div style={{ fontSize: COUNTDOWN.label, fontWeight: 700, letterSpacing: COUNTDOWN.labelTracking, textTransform: "uppercase", lineHeight: 1.2, color: COLORS.accent, whiteSpace: "nowrap" }}>
        {c.label}
      </div>
      <div data-countdown-value="" style={{ fontSize: COUNTDOWN.value, fontWeight: 800, lineHeight: 1, color: COLORS.text, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {c.value}
      </div>
    </div>
  );
};

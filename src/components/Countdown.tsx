/**
 * A countdown to an instant. Live when the web player provides the clock,
 * otherwise the static `fallbackMs` (Studio, renders, stills). The one
 * format of the screens, the same as the countdown top right: H:MM:SS from
 * an hour up, MM:SS below (days only when the evening is days away).
 */
import React from "react";
import { useMsUntil } from "../clock";
import { COLORS, type, type TypeName } from "../theme";
import { formatWait } from "../countdown";

export const Countdown: React.FC<{
  targetIso: string;
  fallbackMs: number;
  /** The type token of the value. */
  size?: TypeName;
  /** Shown instead of 00:00 once the target has passed, one token down. */
  doneLabel?: string;
  color?: string;
}> = ({ targetIso, fallbackMs, size = "display", doneLabel = "Starting now", color = COLORS.text }) => {
  const ms = useMsUntil(targetIso, fallbackMs);
  const done = ms <= 0;
  const wordSize: TypeName = size === "display" || size === "title" ? "heading" : size;
  return (
    <div data-countdown="" style={{ ...type(done ? wordSize : size), lineHeight: 1, fontVariantNumeric: "tabular-nums", color, whiteSpace: "nowrap" }}>
      {done ? doneLabel : formatWait(ms)}
    </div>
  );
};

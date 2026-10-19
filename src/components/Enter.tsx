/**
 * Wraps content in the fade-and-rise entrance. On a one-frame Still it renders
 * the settled state, so the Agenda still is never captured mid-move.
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { enterStyle } from "../design/anim";

export const Enter: React.FC<{
  delay?: number;
  distance?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay = 0, distance = 36, style, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return <div style={{ ...style, ...enterStyle(frame, delay, distance, durationInFrames === 1) }}>{children}</div>;
};

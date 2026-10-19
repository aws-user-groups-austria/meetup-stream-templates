/**
 * The slow, quiet backdrop every scene sits on: two soft glows drifting on a
 * closed path and a faint hexagon grid creeping upwards. Periodic in
 * LOOP_FRAMES, so a looping player never shows a seam.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, glow, HEIGHT, LOOP_FRAMES, WIDTH } from "../theme";

const R = 56;
const TILE_W = Math.sqrt(3) * R;
const TILE_H = 3 * R;

const hexPath = (cx: number, cy: number): string => {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + R * Math.cos(a)).toFixed(2)},${(cy + R * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join("L")}Z`;
};

const TILE = [
  hexPath(0, 0),
  hexPath(TILE_W, 0),
  hexPath(TILE_W / 2, 1.5 * R),
  hexPath(0, 3 * R),
  hexPath(TILE_W, 3 * R),
].join(" ");

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const t = ((frame % LOOP_FRAMES) / LOOP_FRAMES) * Math.PI * 2;
  // One tile of drift per half loop: still seamless at the loop boundary.
  const drift = (((frame % (LOOP_FRAMES / 2)) / (LOOP_FRAMES / 2)) * TILE_H) % TILE_H;

  const g1x = 22 + 7 * Math.sin(t);
  const g1y = 26 + 6 * Math.cos(t);
  const g2x = 80 + 6 * Math.cos(t + 1.3);
  const g2y = 76 + 7 * Math.sin(2 * t);
  const pulse = 0.85 + 0.15 * Math.sin(2 * t);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(circle at ${g1x}% ${g1y}%, ${glow.accent(0.2 * pulse)} 0%, ${glow.accent(0)} 38%)`,
            `radial-gradient(circle at ${g2x}% ${g2y}%, ${glow.deep(0.95)} 0%, ${glow.deep(0)} 46%)`,
            `linear-gradient(180deg, ${COLORS.bg} 0%, ${glow.floor} 100%)`,
          ].join(", "),
        }}
      />
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern
            id="hexgrid"
            width={TILE_W}
            height={TILE_H}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(0 ${(-drift).toFixed(2)})`}
          >
            <path d={TILE} fill="none" stroke={COLORS.accent} strokeWidth={1.2} />
          </pattern>
          <radialGradient id="hexfade" cx="85%" cy="15%" r="75%">
            <stop offset="0%" stopColor={COLORS.text} stopOpacity={1} />
            <stop offset="100%" stopColor={COLORS.text} stopOpacity={0} />
          </radialGradient>
          <mask id="hexmask">
            <rect width={WIDTH} height={HEIGHT} fill="url(#hexfade)" />
          </mask>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#hexgrid)" mask="url(#hexmask)" opacity={0.11} />
      </svg>
      <AbsoluteFill
        style={{ background: `radial-gradient(ellipse at 50% 50%, ${glow.clear} 55%, ${glow.vignette} 100%)` }}
      />
    </AbsoluteFill>
  );
};

/**
 * A speaker's photo from event.json in a circle with the 6 px accent ring, at
 * one of the theme's photo sizes. Initials only when event.json has no photo;
 * never a stock image or someone else's face.
 */
import React from "react";
import { Img } from "remotion";
import { resolveAsset } from "../assets";
import { COLORS, PHOTO, type, type TypeName } from "../theme";
import { initials } from "../model";

export type PhotoSize = "xl" | "l" | "m" | "team" | "s";

const INITIALS: Record<PhotoSize, TypeName> = { xl: "display", l: "title", m: "heading", team: "heading", s: "small" };

export const Avatar: React.FC<{ name: string; photo?: string; size: PhotoSize; style?: React.CSSProperties }> = ({ name, photo, size, style }) => (
  <div
    data-avatar={size}
    style={{
      width: PHOTO[size],
      height: PHOTO[size],
      flex: "0 0 auto",
      boxSizing: "border-box",
      borderRadius: "50%",
      overflow: "hidden",
      border: `${PHOTO.ring}px solid ${COLORS.accent}`,
      background: `linear-gradient(135deg, ${COLORS.surface2} 0%, ${COLORS.surface} 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 0 ${PHOTO[size] / 4}px ${COLORS.accentGlow}`,
      ...style,
    }}
  >
    {photo ? (
      <Img data-photo={photo} src={resolveAsset(photo)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ) : (
      <span style={{ ...type(INITIALS[size], 800), lineHeight: 1, color: COLORS.text }}>{initials(name)}</span>
    )}
  </div>
);

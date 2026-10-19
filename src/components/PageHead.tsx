/**
 * The head every screen opens with, the same hierarchy everywhere: the
 * eyebrow (accent Label), the title (Title, or Display for the one big word
 * of a screen), and an optional subtitle in Lead, secondary. Left-aligned in
 * a two-column screen, centred on a centred one.
 */
import React from "react";
import { STAGGER } from "../design/anim";
import { estimateLines, fitToken } from "../design/fit";
import { clampLines, COLORS, SPACE, TYPE, type, type TypeName } from "../theme";
import { Enter } from "./Enter";
import { Eyebrow } from "./Eyebrow";

export const PageHead: React.FC<{
  overline?: string;
  title: string;
  subtitle?: React.ReactNode;
  align?: "left" | "center";
  /** The title's tokens, largest first: the largest at which it takes one line of `width`, else the first at which it fits `lines`. */
  sizes?: TypeName[];
  width?: number;
  lines?: number;
  titleColor?: string;
  delay?: number;
}> = ({ overline, title, subtitle, align = "left", sizes = ["title"], width, lines = 2, titleColor = COLORS.text, delay = 0 }) => {
  // The largest size at which the title takes one line; else the first that fits `lines`.
  const token = width ? (sizes.find((t) => estimateLines(title, TYPE[t].size, width) === 1) ?? fitToken(title, width, lines, sizes)) : sizes[0]!;
  const center = align === "center";
  return (
    <div data-page-head="" style={{ display: "flex", flexDirection: "column", alignItems: center ? "center" : "flex-start", textAlign: center ? "center" : "left", maxWidth: width ?? "100%" }}>
      {overline ? (
        <Enter delay={delay} style={{ maxWidth: "100%" }}>
          <Eyebrow align={align}>{overline}</Eyebrow>
        </Enter>
      ) : null}
      <Enter delay={delay + STAGGER}>
        <div data-title={token} style={{ ...type(token), color: titleColor, marginTop: overline ? SPACE.sm : 0, textWrap: "balance", ...clampLines(lines) }}>
          {title}
        </div>
      </Enter>
      {subtitle ? (
        <Enter delay={delay + STAGGER * 2}>
          <div style={{ ...type("lead"), color: COLORS.secondary, marginTop: SPACE.sm, textWrap: "balance" }}>{subtitle}</div>
        </Enter>
      ) : null}
    </div>
  );
};

import React from "react";
import { COLORS, RADIUS, SPACE, type } from "../theme";

const Bar: React.FC<{ color: string }> = ({ color }) => <div style={{ width: SPACE.xl, height: SPACE.xs - 2, borderRadius: RADIUS.sm, backgroundColor: color, flex: "0 0 auto" }} />;

/** The overline above a title: a short accent bar and an upper-case Label, on one line (an ellipsis rather than past its column); centred, a bar on each side. */
export const Eyebrow: React.FC<{ children: React.ReactNode; color?: string; align?: "left" | "center" }> = ({ children, color = COLORS.accent, align = "left" }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start", gap: SPACE.sm, maxWidth: "100%" }}>
    <Bar color={color} />
    <div style={{ ...type("label"), color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{children}</div>
    {align === "center" ? <Bar color={color} /> : null}
  </div>
);

import React from "react";
import { COLORS, QR, RADIUS, SPACE, type } from "../theme";
import { prettyUrl } from "../model";
import { urlHref } from "../embed";
import { Linked } from "./Linked";
import { Qr } from "./Qr";

/** Longer than this, a printed URL wraps into noise; the QR carries it instead. */
const MAX_PRINTED = 34;

/** A QR on white (a QR needs its light quiet zone), a caption and, when short, the URL under it. */
export const QrCard: React.FC<{ url: string; size: "l" | "m" | "s"; caption?: string; showUrl?: boolean }> = ({ url, size, caption, showUrl = true }) => (
  <Linked to={(embed) => urlHref(embed, url)} label={caption ? `${caption}: open ${prettyUrl(url)}` : `Open ${prettyUrl(url)}`} radius={RADIUS.lg}>
  <div data-qr={url} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.sm }}>
    <div style={{ padding: QR.pad, backgroundColor: COLORS.qrLight, borderRadius: RADIUS.md, boxShadow: `0 0 ${SPACE.x2}px ${COLORS.accentGlow}` }}>
      <Qr value={url} size={QR[size]} />
    </div>
    {caption ? <div style={{ ...type("small"), color: COLORS.secondary, textAlign: "center", textWrap: "balance" }}>{caption}</div> : null}
    {showUrl && prettyUrl(url).length <= MAX_PRINTED ? <div style={{ ...type("small"), color: COLORS.accent, textAlign: "center" }}>{prettyUrl(url)}</div> : null}
  </div>
  </Linked>
);

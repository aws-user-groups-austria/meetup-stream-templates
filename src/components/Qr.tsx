/**
 * A QR code drawn locally from the `qrcode` package's module matrix into an
 * inline SVG. Deterministic: same text, same picture, no network.
 */
import QRCode from "qrcode";
import React, { useMemo } from "react";
import { COLORS } from "../theme";

const QUIET = 3;

export const Qr: React.FC<{ value: string; size: number; fg?: string; bg?: string }> = ({
  value,
  size,
  fg = COLORS.qrDark,
  bg = COLORS.qrLight,
}) => {
  const { d, count } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    let path = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) path += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
      }
    }
    return { d: path, count: n + QUIET * 2 };
  }, [value]);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      <rect width={count} height={count} fill={bg} />
      <path d={d} fill={fg} />
    </svg>
  );
};

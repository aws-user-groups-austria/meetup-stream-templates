/**
 * A host's logo on the header's archive screens ("Our meetups", "Our hosts
 * and sponsors"): every one on the same light plate, in its colours for a
 * light background (archive.json hosts[].plateLogo), so a coloured or dark
 * logo reads as well as any other and the row looks like one set. Without
 * that file, the name set in type on the plate. Never the dark-screen file
 * here: its white lettering would vanish.
 */
import React from "react";
import { Img } from "remotion";
import { resolveAsset } from "../assets";
import { ARCHIVE, clampLines, RADIUS, SPACE, type } from "../theme";

export const LogoPlate: React.FC<{ host: { name: string; plateLogo?: string } | undefined; width: number; height: number; logoH: number }> = ({ host, width, height, logoH }) => (
  <div
    data-plate={host?.name ?? ""}
    style={{
      width,
      height,
      boxSizing: "border-box",
      padding: SPACE.lg,
      borderRadius: RADIUS.lg,
      backgroundColor: ARCHIVE.plate,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {host?.plateLogo ? (
      <Img data-plate-logo={host.plateLogo} src={resolveAsset(host.plateLogo)} style={{ display: "block", height: logoH, width: Math.round(width * ARCHIVE.logoW), objectFit: "contain" }} />
    ) : host ? (
      <div data-plate-name="" style={{ ...type("body", 700), color: ARCHIVE.plateText, textAlign: "center", ...clampLines(2) }}>
        {host.name}
      </div>
    ) : null}
  </div>
);

/**
 * The sponsor's logo from event.json, large and straight on the screen,
 * with no plate, card or box (the logo files are made for a dark screen). Without a logo, the sponsor's name set in type. Never a logo
 * looked up by name: a similarly named company's logo is a different company.
 */
import React from "react";
import { Img } from "remotion";
import { resolveAsset } from "../assets";
import { fitToken } from "../design/fit";
import { clampLines, COLORS, LOGO, type, type TypeName } from "../theme";
import { sponsorName } from "../model";

export const SponsorMark: React.FC<{ sponsor: { name: string; short?: string; logo?: string }; width: number; height?: number; align?: "left" | "center"; nameToken?: TypeName }> = ({
  sponsor,
  width,
  height = LOGO.hostSponsor,
  align = "left",
  nameToken,
}) => {
  if (sponsor.logo) {
    return (
      <Img
        data-sponsor-logo={sponsor.logo}
        src={resolveAsset(sponsor.logo)}
        style={{ display: "block", height, maxWidth: width, objectFit: "contain", objectPosition: `${align} center` }}
      />
    );
  }
  const name = sponsorName(sponsor);
  return (
    <div data-sponsor-name="" style={{ ...type(nameToken ?? fitToken(name, width, 2, ["title", "heading", "lead"]), 700), color: COLORS.text, maxWidth: width, textAlign: align, textWrap: "balance", ...clampLines(2) }}>
      {name}
    </div>
  );
};

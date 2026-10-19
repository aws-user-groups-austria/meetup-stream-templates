/**
 * The sponsor's screen, centred: the eyebrow, "Thank you" in Display, an
 * optional line under it, the sponsor's logo from event.json large on the
 * screen background (or its name in type), and an optional closing line in
 * the accent ("Over to RBI"). Shared by the SponsorHandover and the
 * pre-show's sponsor panel. Two sponsors side by side.
 */
import React from "react";
import { STAGGER } from "../design/anim";
import { fitToken } from "../design/fit";
import { sponsorName, type Sponsor } from "../model";
import { COLORS, CONTENT_W, GROUP_GAP, LOGO, RADIUS, SPACE, type, type TypeName } from "../theme";
import { Enter } from "./Enter";
import { PageHead } from "./PageHead";
import { SponsorMark } from "./SponsorMark";
import { Linked } from "./Linked";
import { urlHref } from "../embed";

export const SponsorThanks: React.FC<{ sponsors: Sponsor[]; overline: string; subtitle?: string; closing?: string }> = ({ sponsors, overline, subtitle, closing }) => {
  const shown = sponsors.slice(0, 2);
  const markW = shown.length > 1 ? Math.floor((CONTENT_W - SPACE.x3) / 2) : CONTENT_W;
  // Names set in type (no logo) share one token: the smallest any of them needs.
  const order: TypeName[] = ["title", "heading", "lead"];
  const nameToken = order[Math.max(0, ...shown.filter((s) => !s.logo).map((s) => order.indexOf(fitToken(sponsorName(s), markW, 2, order))))]!;
  return (
    <div data-sponsor-thanks="" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: GROUP_GAP, width: CONTENT_W }}>
      <PageHead overline={overline} title="Thank you" sizes={["display"]} subtitle={subtitle} align="center" width={CONTENT_W} lines={1} />
      {shown.length > 0 ? (
        <Enter delay={STAGGER * 3} distance={32} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SPACE.x3, width: CONTENT_W }}>
          {shown.map((s) => (
            <Linked key={s.name} to={s.url ? (embed) => urlHref(embed, s.url!) : null} label={`${sponsorName(s)}: website`} radius={RADIUS.lg}>
              <SponsorMark sponsor={s} width={markW} height={shown.length > 1 ? LOGO.hostSponsor * 0.75 : LOGO.hostSponsor} align="center" nameToken={nameToken} />
            </Linked>
          ))}
        </Enter>
      ) : null}
      {closing ? (
        <Enter delay={STAGGER * 4}>
          <div style={{ ...type("heading"), color: COLORS.accent, textAlign: "center" }}>{closing}</div>
        </Enter>
      ) : null}
    </div>
  );
};

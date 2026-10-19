/**
 * "Our hosts and sponsors", for the meetup page's header tour: every company
 * that hosted one of our meetups before this evening, once each, most recent
 * first (archive.ts hostsBefore), as a calm grid of the same light plates
 * (components/LogoPlate.tsx) with the meetup(s) each hosted under it. On the
 * header each one opens the sponsor's site, else the page of the meetup they
 * hosted. From the archive (ArchiveContext); only the head without it.
 */
import React from "react";
import { hostsBefore, meetupHeadline, useArchive, type HostCard } from "../archive";
import { Enter } from "../components/Enter";
import { Linked } from "../components/Linked";
import { LogoPlate } from "../components/LogoPlate";
import { PageHead } from "../components/PageHead";
import { SceneFrame } from "../components/SceneFrame";
import { STAGGER } from "../design/anim";
import { meetupPage, urlHref, type Embed } from "../embed";
import type { SceneProps } from "../props";
import { ARCHIVE, COLORS, CONTENT_W, GROUP_GAP, RADIUS, SPACE, type } from "../theme";

/** How many plates fit: two rows. */
const MAX = ARCHIVE.hostCols * 2;

const caption = (h: HostCard): string => (h.meetups.length === 1 ? meetupHeadline(h.meetups[0]!) : `${h.meetups.length} meetups`);

export const hostLink = (embed: Embed, h: HostCard) => (h.url ? urlHref(embed, h.url) : meetupPage(embed, h.meetups[0]!.id));

export const OurSponsors: React.FC<SceneProps> = ({ event }) => {
  const hosts = hostsBefore(useArchive(), event).slice(0, MAX);
  const cols = Math.min(ARCHIVE.hostCols, Math.max(1, hosts.length));
  const cell = Math.floor((CONTENT_W - ARCHIVE.hostColGap * (cols - 1)) / cols);
  return (
    <SceneFrame bar={{ event }}>
      <div data-our-sponsors={hosts.length} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: GROUP_GAP, width: CONTENT_W }}>
        <PageHead overline="Thank you" title="Our hosts and sponsors" align="center" width={CONTENT_W} lines={1} />
        {hosts.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${cell}px)`, columnGap: ARCHIVE.hostColGap, rowGap: ARCHIVE.hostRowGap }}>
            {hosts.map((h, i) => (
              <Enter key={h.name} delay={STAGGER * 2 + i * 2} distance={24}>
                <Linked to={(embed) => hostLink(embed, h)} label={h.url ? `${h.name}: website` : `${h.name}: the meetup they hosted`} radius={RADIUS.lg}>
                  <div data-host={h.name} style={{ width: cell, display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.sm }}>
                    <LogoPlate host={h} width={cell} height={ARCHIVE.hostPlateH} logoH={ARCHIVE.hostLogoH} />
                    <div style={{ ...type("label"), color: COLORS.muted, whiteSpace: "nowrap" }}>{caption(h)}</div>
                  </div>
                </Linked>
              </Enter>
            ))}
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};

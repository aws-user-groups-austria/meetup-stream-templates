/**
 * "Our meetups", for the meetup page's header tour: this evening (or the
 * next one, seen from an older evening) and the last ones before it, four
 * large cards in one row, newest first (archive.ts meetupsAround). Each card:
 * the host's logo on the light plate, the date, "Meetup #52" (or the
 * evening's name) and, for this evening and the next one, a tag. On the header
 * each card opens that meetup's page. From the archive (ArchiveContext),
 * never from event.json; only the head without it.
 */
import React from "react";
import { meetupHeadline, meetupsAround, useArchive, type MeetupCard } from "../archive";
import { Enter } from "../components/Enter";
import { Linked } from "../components/Linked";
import { LogoPlate } from "../components/LogoPlate";
import { PageHead } from "../components/PageHead";
import { SceneFrame } from "../components/SceneFrame";
import { STAGGER } from "../design/anim";
import { useEmber } from "../design/fonts";
import { boldWidth } from "../design/metrics";
import { meetupPage } from "../embed";
import type { SceneProps } from "../props";
import { ARCHIVE, clampLines, COLORS, CONTENT_W, GROUP_GAP, RADIUS, SPACE, TYPE, type, type TypeName } from "../theme";
import { localCompactDate } from "../time";

const TAG: Record<MeetupCard["when"], string | null> = { past: null, current: "This evening", next: "Up next" };

const Card: React.FC<{ m: MeetupCard; width: number; ember: boolean }> = ({ m, width, ember }) => {
  const inner = width - ARCHIVE.cardPad * 2;
  const headline = meetupHeadline(m);
  // Lead on one line, else Body on up to two: the box is as tall as two lines of Body either way, so the cards line up.
  const oneLine = boldWidth(headline, TYPE.lead.size, ember) <= inner;
  const token: TypeName = oneLine ? "lead" : "body";
  const on = m.when === "current";
  const tag = TAG[m.when];
  return (
    <Linked to={(embed) => meetupPage(embed, m.id)} label={`${headline}: the meetup's page`} radius={RADIUS.xl}>
      <div
        data-meetup={m.id}
        data-current={on ? "" : undefined}
        style={{
          width,
          boxSizing: "border-box",
          padding: ARCHIVE.cardPad,
          borderRadius: RADIUS.xl,
          backgroundColor: on ? COLORS.accentSoft : COLORS.glass,
          border: `1px solid ${on ? COLORS.accent : COLORS.border}`,
          display: "flex",
          flexDirection: "column",
          gap: SPACE.md,
        }}
      >
        <LogoPlate host={m.hosts[0]} width={inner} height={ARCHIVE.cardPlateH} logoH={ARCHIVE.cardLogoH} />
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs }}>
          <div style={{ ...type("label"), color: COLORS.accent, whiteSpace: "nowrap" }}>{localCompactDate(m.start)}</div>
          <div style={{ height: Math.ceil(TYPE.body.size * TYPE.body.lineHeight * 2), display: "flex", alignItems: "center", minWidth: 0 }}>
            <div data-headline={token} style={{ ...type(token, 700), color: COLORS.text, textWrap: "balance", ...clampLines(oneLine ? 1 : 2) }}>
              {headline}
            </div>
          </div>
          <div style={{ ...type("label"), color: on ? COLORS.text : COLORS.muted, minHeight: TYPE.label.size * TYPE.label.lineHeight }}>{tag ?? ""}</div>
        </div>
      </div>
    </Linked>
  );
};

export const OurMeetups: React.FC<SceneProps> = ({ event }) => {
  const archive = useArchive();
  const ember = useEmber();
  const cards = meetupsAround(archive, event);
  const n = Math.max(1, cards.length);
  const width = Math.floor((CONTENT_W - ARCHIVE.cardGap * (n - 1)) / n);
  return (
    <SceneFrame bar={{ event }}>
      <div data-our-meetups={cards.length} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: GROUP_GAP, width: CONTENT_W }}>
        <PageHead overline={event.group.name} title="Our meetups" align="center" width={CONTENT_W} lines={1} />
        {cards.length > 0 ? (
          <div style={{ display: "flex", gap: ARCHIVE.cardGap }}>
            {cards.map((m, i) => (
              <Enter key={m.id} delay={STAGGER * 2 + i * 3} distance={24}>
                <Card m={m} width={width} ember={ember} />
              </Enter>
            ))}
          </div>
        ) : null}
      </div>
    </SceneFrame>
  );
};

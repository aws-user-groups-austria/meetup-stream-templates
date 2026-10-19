/**
 * The close, two columns: on the left "Thank you" to the speakers (their
 * photos from event.json, names under them) and "Networking until 22:00"
 * (from `end`); on the right "Please leave feedback" over the large QR to
 * links.feedback. The host is in the bottom bar.
 */
import React from "react";
import { Avatar } from "../components/Avatar";
import { Enter } from "../components/Enter";
import { PageHead } from "../components/PageHead";
import { QrCard } from "../components/QrCard";
import { Linked } from "../components/Linked";
import { speakerHref } from "../embed";
import { SceneFrame } from "../components/SceneFrame";
import { STAGGER } from "../design/anim";
import { useEmber } from "../design/fonts";
import { boldWidth } from "../design/metrics";
import { clampLines, COLORS, CONTENT_W, GROUP_GAP, PHOTO, QR, RADIUS, SPACE, SPLIT_GAP, TYPE, type } from "../theme";
import type { Speaker } from "../event.schema";
import { findSegment, talks } from "../model";
import type { SceneProps } from "../props";
import { localTime } from "../time";

const SIDE_W = QR.l + QR.pad * 2 + SPACE.x2;

export const Closing: React.FC<SceneProps> = ({ event, segmentId }) => {
  const segment = findSegment(event, segmentId, "closing");
  const ember = useEmber();
  const speakers: Speaker[] = [];
  for (const t of talks(event)) for (const sp of t.talk?.speakers ?? []) if (!speakers.some((s) => s.name === sp.name)) speakers.push(sp);
  const onMeetup = event.links.feedback === event.links.meetup;
  const mainW = CONTENT_W - SIDE_W - SPLIT_GAP;
  // Up to four speakers as M photos with the name under each; more as S photos in rows.
  const big = speakers.length <= 4;
  const shown = speakers.slice(0, big ? 4 : 9);
  const cols = shown.map((sp) => Math.ceil(Math.max(PHOTO.m, boldWidth(sp.name, TYPE.small.size, ember))));
  const oneLine = cols.reduce((w, c) => w + c, 0) + SPACE.xl * Math.max(0, cols.length - 1) <= mainW;
  const cell = Math.floor((mainW - SPACE.xl * Math.max(0, shown.length - 1)) / Math.max(1, shown.length));
  const perRow = 3;
  const smallCell = Math.floor((mainW - SPACE.xl * (perRow - 1)) / perRow);
  return (
    <SceneFrame bar={{ event, currentId: segment?.id }}>
      <div style={{ display: "flex", alignItems: "center", gap: SPLIT_GAP, width: CONTENT_W }}>
        <div style={{ width: mainW, display: "flex", flexDirection: "column", gap: GROUP_GAP }}>
          <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xl }}>
          <PageHead title="Thank you" sizes={["display"]} lines={1} subtitle={speakers.length > 0 ? "to our speakers" : undefined} />
          {shown.length > 0 ? (
            <Enter delay={STAGGER * 2}>
              {big ? (
                <div style={{ display: "flex", gap: SPACE.xl }}>
                  {shown.map((sp, i) => (
                    <Linked key={sp.name} to={(embed) => speakerHref(embed, event, sp.name)} label={`${sp.name} on the meetup page`} radius={RADIUS.lg} style={{ flex: "0 0 auto" }}>
                    <div data-closing-speaker={sp.name} style={{ width: oneLine ? cols[i] : cell, flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.sm, textAlign: "center" }}>
                      <Avatar name={sp.name} photo={sp.photo} size="m" />
                      <div style={{ ...type("small", 700), ...(oneLine ? { whiteSpace: "nowrap" } : { maxWidth: cell, textWrap: "balance", ...clampLines(2) }) }}>{sp.name}</div>
                    </div>
                    </Linked>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: `${SPACE.md}px ${SPACE.xl}px` }}>
                  {shown.map((sp) => (
                    <Linked key={sp.name} to={(embed) => speakerHref(embed, event, sp.name)} label={`${sp.name} on the meetup page`} radius={RADIUS.lg}>
                    <div data-closing-speaker={sp.name} style={{ width: smallCell, display: "flex", alignItems: "center", gap: SPACE.md }}>
                      <Avatar name={sp.name} photo={sp.photo} size="s" />
                      <div style={{ ...type("small", 700), minWidth: 0, ...clampLines(2) }}>{sp.name}</div>
                    </div>
                    </Linked>
                  ))}
                </div>
              )}
            </Enter>
          ) : null}
          </div>
          <Enter delay={STAGGER * 3}>
            <div style={{ ...type("heading"), color: COLORS.accent }}>Networking until {localTime(event.end)}</div>
          </Enter>
        </div>
        <Enter delay={STAGGER * 2} style={{ width: SIDE_W, flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.lg }}>
          <div style={{ ...type("lead", 700), textAlign: "center", textWrap: "balance" }}>Please leave feedback</div>
          <QrCard url={event.links.feedback} size="l" caption={onMeetup ? "Scan to rate tonight on Meetup" : "Scan to tell us how it went"} showUrl={false} />
        </Enter>
      </div>
    </SceneFrame>
  );
};

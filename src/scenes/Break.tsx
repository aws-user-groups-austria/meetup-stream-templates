/**
 * The break, two columns: the break's name, "Back at 19:20" and the
 * countdown in Display on the left, what is next on one glass card on the
 * right. When there is an upcoming community day, the second half
 * of the hold announces it (without a QR); the countdown top right keeps
 * counting to the next part.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Countdown } from "../components/Countdown";
import { Enter } from "../components/Enter";
import { Eyebrow } from "../components/Eyebrow";
import { PageHead } from "../components/PageHead";
import { SceneFrame } from "../components/SceneFrame";
import { Speaker } from "../components/Speaker";
import { UpcomingBody } from "../components/UpcomingBody";
import { secondViewOpacity, STAGGER } from "../design/anim";
import { fitToken } from "../design/fit";
import { useEmber } from "../design/fonts";
import { boldWidth } from "../design/metrics";
import { clampLines, COLORS, CONTENT_W, GROUP_GAP, INTRO_FRAMES, LOOP_FRAMES, RADIUS, SPACE, SPLIT_GAP, TYPE, type } from "../theme";
import { findSegment, nextSegment, segmentLabel, upcomingFor } from "../model";
import type { SceneProps } from "../props";
import { useEmbed } from "../embed";
import { localTime, msBetween } from "../time";

/** The "Up next" card. */
const NEXT_W = 864;
const PAD = SPACE.xl;

export const Break: React.FC<SceneProps> = ({ event, segmentId }) => {
  const frame = useCurrentFrame();
  const embed = useEmbed();
  const segment = findSegment(event, segmentId, "break");
  if (!segment) return <SceneFrame bar={{ event }}>{null}</SceneFrame>;
  const next = nextSegment(event, segment);
  const backAt = next?.start ?? segment.end;
  const fallback = msBetween(segment.start, backAt);
  const nextTitle = next ? segmentLabel(next) : undefined;
  const speakers = next?.talk?.speakers ?? [];
  const inner = NEXT_W - PAD * 2;
  // One line at Heading when it fits in the font on screen; one step down
  // (Lead) only if Heading would overflow; two lines only if both would.
  const ember = useEmber();
  const oneLine = (["heading", "lead"] as const).find((t) => nextTitle !== undefined && boldWidth(nextTitle, TYPE[t].size, ember) <= inner);
  const titleToken = oneLine ?? fitToken(nextTitle ?? "", inner, 2, ["heading", "lead"]);
  // The meetup page's header holds the first view (its tour has the community days on their own screen).
  const second = !embed && upcomingFor(event).length > 0 ? secondViewOpacity(frame, INTRO_FRAMES, LOOP_FRAMES) : 0;
  return (
    <SceneFrame bar={{ event, currentId: segment.id }}>
      <AbsoluteFill style={{ opacity: 1 - second, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPLIT_GAP }}>
        <div style={{ display: "flex", flexDirection: "column", gap: GROUP_GAP }}>
          <PageHead overline={segmentLabel(segment)} title={`Back at ${localTime(backAt)}`} />
          <Enter delay={STAGGER * 2}>
            <Countdown targetIso={backAt} fallbackMs={fallback} color={COLORS.accent} doneLabel="We are starting" />
          </Enter>
        </div>
        {next ? (
          <Enter delay={STAGGER * 3} distance={40}>
            <div
              style={{
                width: NEXT_W,
                boxSizing: "border-box",
                padding: PAD,
                borderRadius: RADIUS.xl,
                backgroundColor: COLORS.glass,
                border: `1px solid ${COLORS.border}`,
                display: "flex",
                flexDirection: "column",
                gap: SPACE.lg,
              }}
            >
              <Eyebrow>Up next</Eyebrow>
              <div data-next-title={titleToken} style={{ ...type(titleToken), ...(oneLine ? { whiteSpace: "nowrap" } : { textWrap: "balance", ...clampLines(2) }) }}>
                {nextTitle}
              </div>
              {speakers.slice(0, 3).map((sp) => (
                <Speaker key={sp.name} event={event} speaker={sp} photo="s" width={inner} names={["body"]} role="small" />
              ))}
            </div>
          </Enter>
        ) : null}
      </AbsoluteFill>
      {second > 0 ? (
        <AbsoluteFill data-view="upcoming" style={{ opacity: second, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <UpcomingBody event={event} width={CONTENT_W} />
        </AbsoluteFill>
      ) : null}
    </SceneFrame>
  );
};

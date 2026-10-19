/**
 * The opening, two columns (CollageSplit): the date, "Welcome" in Display,
 * "to the AWS User Group Vienna", "Meetup #53" in the accent on the left,
 * the hexagon photo collage of past meetups (event.json community.photos[0])
 * on the right. In the second half of the hold, the agenda screen
 * (AgendaPage) with the welcome highlighted.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AgendaPage } from "../components/AgendaList";
import { CollageSplit } from "../components/CollageSplit";
import { Enter } from "../components/Enter";
import { PageHead } from "../components/PageHead";
import { SceneFrame } from "../components/SceneFrame";
import { secondViewOpacity, STAGGER } from "../design/anim";
import { COLORS, INTRO_FRAMES, LOOP_FRAMES, SPACE, STAGE_H_FULL, type } from "../theme";
import { findSegment, meetupNumber, shortTitle } from "../model";
import type { SceneProps } from "../props";
import { useEmbed } from "../embed";
import { localDate } from "../time";

export const Welcome: React.FC<SceneProps> = ({ event, segmentId }) => {
  const frame = useCurrentFrame();
  const current = findSegment(event, segmentId, "welcome");
  // The meetup page's header holds the first view: its tour has the agenda as a screen of its own.
  const embed = useEmbed();
  const second = embed ? 0 : secondViewOpacity(frame, INTRO_FRAMES, LOOP_FRAMES);
  const number = meetupNumber(event);
  return (
    <SceneFrame event={event} segmentId={current?.id}>
      <AbsoluteFill data-view="welcome" style={{ opacity: 1 - second, display: "flex", justifyContent: "center" }}>
        <CollageSplit collage={event.community?.photos[0]}>
          {({ width, align }) => (
            <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", textAlign: align }}>
              <PageHead overline={localDate(event.doorsOpen)} title="Welcome" sizes={["display"]} lines={1} subtitle={`to the ${event.group.name}`} align={align} width={width} />
              <Enter delay={STAGGER * 3}>
                <div style={{ ...type("heading"), color: COLORS.accent, marginTop: SPACE.md }}>{number ? `Meetup ${number}` : shortTitle(event)}</div>
              </Enter>
            </div>
          )}
        </CollageSplit>
      </AbsoluteFill>
      {second > 0 ? (
        <AbsoluteFill data-view="agenda" style={{ opacity: second, display: "flex", justifyContent: "center" }}>
          <AgendaPage event={event} highlightId={current?.id} stageH={STAGE_H_FULL} />
        </AbsoluteFill>
      ) : null}
    </SceneFrame>
  );
};

/**
 * After the event's end, the bookend of the Welcome (CollageSplit): the
 * event, "Thank you for coming" in Display, see you next time, where the
 * next events are; the photo collage on the right.
 */
import React from "react";
import { CollageSplit } from "../components/CollageSplit";
import { Enter } from "../components/Enter";
import { PageHead } from "../components/PageHead";
import { SceneFrame } from "../components/SceneFrame";
import { Linked } from "../components/Linked";
import { urlHref } from "../embed";
import { STAGGER } from "../design/anim";
import { COLORS, GROUP_GAP, type } from "../theme";
import { nextEventsUrl, prettyUrl, shortTitle } from "../model";
import type { SceneProps } from "../props";

export const AfterEnd: React.FC<SceneProps> = ({ event }) => (
  <SceneFrame>
    <CollageSplit collage={event.community?.photos[0]}>
      {({ width, align }) => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", textAlign: align, gap: GROUP_GAP }}>
          <PageHead overline={shortTitle(event)} title="Thank you for coming" sizes={["display", "title"]} lines={2} subtitle="See you next time" align={align} width={width} />
          <Enter delay={STAGGER * 3}>
            <Linked to={(embed) => urlHref(embed, nextEventsUrl(event))} label="Our next events" style={{ display: "inline-block" }}>
              <div style={{ ...type("heading"), color: COLORS.accent }}>{prettyUrl(nextEventsUrl(event))}</div>
            </Linked>
          </Enter>
        </div>
      )}
    </CollageSplit>
  </SceneFrame>
);

/**
 * One coming community day per screen, for the meetup page's header tour:
 * the n-th of upcomingFor(event) (`index`, soonest first), as UpcomingBody
 * draws it everywhere (the website's screenshot, the QR code, the url, the
 * name, the day and place, the speakers). Several days are several screens.
 */
import React from "react";
import { SceneFrame } from "../components/SceneFrame";
import { UpcomingBody } from "../components/UpcomingBody";
import { CONTENT_W } from "../theme";
import type { SceneProps } from "../props";

export const CommunityDay: React.FC<SceneProps> = ({ event, index }) => (
  <SceneFrame bar={{ event }}>
    <UpcomingBody event={event} index={index ?? 0} width={CONTENT_W} />
  </SceneFrame>
);

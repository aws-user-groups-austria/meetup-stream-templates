/**
 * The next AWS Community Day on its own: name, day and place, the speakers
 * there, a small QR to its site. The run of show offers it (one key press
 * away, never by the clock) when event.json has an upcoming day.
 */
import React from "react";
import { SceneFrame } from "../components/SceneFrame";
import { UpcomingBody } from "../components/UpcomingBody";
import { CONTENT_W } from "../theme";
import type { SceneProps } from "../props";

export const Upcoming: React.FC<SceneProps> = ({ event, segmentId }) => (
  <SceneFrame bar={{ event, currentId: segmentId }}>
    <UpcomingBody event={event} width={CONTENT_W} />
  </SceneFrame>
);

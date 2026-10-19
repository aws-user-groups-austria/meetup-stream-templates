/**
 * The first 90 s of a talk, one message: "Next up" and the time, the talk
 * title, the speakers (photo, name, role at company) large. The layout per
 * number of speakers is TalkHero's, shared with NowSpeaking.
 */
import React from "react";
import { SceneFrame } from "../components/SceneFrame";
import { TalkHero } from "../components/TalkHero";
import { findSegment } from "../model";
import type { SceneProps } from "../props";

export const SpeakerHandover: React.FC<SceneProps> = ({ event, segmentId }) => {
  const segment = findSegment(event, segmentId, "talk");
  if (!segment) return <SceneFrame bar={{ event }}>{null}</SceneFrame>;
  return (
    <SceneFrame bar={{ event, currentId: segment.id }}>
      <TalkHero event={event} segment={segment} overline="Next up" />
    </SceneFrame>
  );
};

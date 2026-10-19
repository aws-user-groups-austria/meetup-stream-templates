/**
 * The hold for the rest of a talk: "Now speaking" and the time, the title
 * and its speakers with their photos, as on the SpeakerHandover (TalkHero).
 * No abstract. What comes next is in the bottom bar.
 */
import React from "react";
import { SceneFrame } from "../components/SceneFrame";
import { TalkHero } from "../components/TalkHero";
import { findSegment } from "../model";
import type { SceneProps } from "../props";

export const NowSpeaking: React.FC<SceneProps> = ({ event, segmentId }) => {
  const segment = findSegment(event, segmentId, "talk");
  if (!segment) return <SceneFrame bar={{ event }}>{null}</SceneFrame>;
  return (
    <SceneFrame bar={{ event, currentId: segment.id }}>
      <TalkHero event={event} segment={segment} overline="Now speaking" />
    </SceneFrame>
  );
};

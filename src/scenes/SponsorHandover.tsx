/**
 * The sponsor's turn, centred: the eyebrow with the time, "Thank you", the
 * sponsor's logo from event.json large on the screen background (or its
 * name in type), and "Over to RBI" in the accent. In the meetup page's
 * header (embed) there is no handover, so no "Over to": just the thanks.
 */
import React from "react";
import { SceneFrame } from "../components/SceneFrame";
import { SponsorThanks } from "../components/SponsorThanks";
import { useEmbed } from "../embed";
import { findSegment, sponsorFor, sponsorShort } from "../model";
import type { Sponsor } from "../model";
import type { SceneProps } from "../props";
import { localTime } from "../time";

/** "Over to RBI"; a long name without a short form would be a paragraph. */
const overTo = (s: Sponsor): string => {
  const short = sponsorShort(s);
  return short.length <= 28 ? `Over to ${short}` : "Over to our sponsor";
};

export const SponsorHandover: React.FC<SceneProps> = ({ event, segmentId }) => {
  const segment = findSegment(event, segmentId, "sponsor");
  const sponsor = sponsorFor(event, segment);
  const overline = `${segment ? `${localTime(segment.start)} · ` : ""}${sponsor ? "Our sponsor" : "Our sponsors"}`;
  const embedded = useEmbed() !== null;
  return (
    <SceneFrame bar={{ event, currentId: segment?.id }}>
      <SponsorThanks sponsors={sponsor ? [sponsor] : []} overline={overline} closing={sponsor && !embedded ? overTo(sponsor) : undefined} />
    </SceneFrame>
  );
};

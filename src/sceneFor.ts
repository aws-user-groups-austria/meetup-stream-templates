/**
 * Which scene a segment shows at a given moment. Pure, no React, so the web
 * player and the unit tests can use it without loading any component.
 */
import type { EventFile, Segment } from "./event.schema";

export const SCENE_IDS = [
  "PreShow",
  "Welcome",
  "WhoWeAre",
  "WhatWeDo",
  "Members",
  "GrowingTogether",
  "SponsorHandover",
  "SpeakerHandover",
  "NowSpeaking",
  "Break",
  "Closing",
  "AfterEnd",
  "Agenda",
  "Upcoming",
  // The meetup page's header tour only (web-player/src/tour.ts); never on the room screen's clock.
  "CommunityDay",
  "OurMeetups",
  "OurSponsors",
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

/** A talk opens with the handover for this long, then holds on NowSpeaking. */
export const SPEAKER_HANDOVER_MS = 90_000;

/** Each intro screen of the welcome is up this long by the clock. */
export const INTRO_SCREEN_MS = 60_000;

/**
 * The welcome's screens, as in the group's deck: Welcome, then Who we are,
 * What we do, Introducing our members and Growing together, each only when
 * event.json's `community` has its data.
 */
export const introScenes = (event?: Pick<EventFile, "community">): SceneId[] => {
  const c = event?.community;
  return [
    "Welcome" as const,
    ...(c && c.team.length > 0 ? (["WhoWeAre"] as const) : []),
    ...(c && c.groups.length > 0 ? (["WhatWeDo"] as const) : []),
    ...(c && c.badges.length > 0 ? (["Members"] as const) : []),
    ...(c?.codeOfConduct ? (["GrowingTogether"] as const) : []),
  ];
};

/**
 * The scene for `segment`, `msIntoSegment` after its start. Before doors open
 * (PreShow) and after the event's end (AfterEnd) are the player's call, since
 * no segment covers them. Pass the event so the welcome can step through its
 * intro screens.
 */
export const sceneFor = (segment: Pick<Segment, "kind">, msIntoSegment: number, event?: Pick<EventFile, "community">): SceneId => {
  switch (segment.kind) {
    case "networking":
      return "PreShow";
    case "welcome": {
      const intro = introScenes(event);
      return intro[Math.min(intro.length - 1, Math.max(0, Math.floor(msIntoSegment / INTRO_SCREEN_MS)))]!;
    }
    case "sponsor":
      return "SponsorHandover";
    case "talk":
      return msIntoSegment < SPEAKER_HANDOVER_MS ? "SpeakerHandover" : "NowSpeaking";
    case "break":
      return "Break";
    case "closing":
      return "Closing";
  }
};

/** Every scene a segment can show, in order; what manual stepping walks. */
export const scenesInSegment = (segment: Pick<Segment, "kind">, event?: Pick<EventFile, "community">): SceneId[] =>
  segment.kind === "talk" ? ["SpeakerHandover", "NowSpeaking"] : segment.kind === "welcome" ? introScenes(event) : [sceneFor(segment, 0)];

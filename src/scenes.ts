/**
 * The scene registry the web player uses: for each scene id its component,
 * its length, where its hold loop starts, and a label for the help overlay.
 *
 * A player plays a scene from frame 0 (the entrances) and then loops
 * [loopFrom, durationInFrames). The background is flat and every view change
 * inside a hold is periodic over that range, so the loop has no seam. PreShow
 * loops from 0: its panels are the loop.
 */
import type React from "react";
import { INTRO_FRAMES, LOOP_FRAMES, PRESHOW_FRAMES } from "./theme";
import type { SceneProps } from "./props";
import type { SceneId } from "./sceneFor";
import { AfterEnd } from "./scenes/AfterEnd";
import { Agenda } from "./scenes/Agenda";
import { Break } from "./scenes/Break";
import { Closing } from "./scenes/Closing";
import { NowSpeaking } from "./scenes/NowSpeaking";
import { PreShow } from "./scenes/PreShow";
import { SpeakerHandover } from "./scenes/SpeakerHandover";
import { SponsorHandover } from "./scenes/SponsorHandover";
import { Upcoming } from "./scenes/Upcoming";
import { GrowingTogether, Members, WhatWeDo, WhoWeAre } from "./scenes/Intro";
import { Welcome } from "./scenes/Welcome";
import { CommunityDay } from "./scenes/CommunityDay";
import { OurMeetups } from "./scenes/OurMeetups";
import { OurSponsors } from "./scenes/OurSponsors";

export { INTRO_SCREEN_MS, SCENE_IDS, SPEAKER_HANDOVER_MS, introScenes, sceneFor, scenesInSegment, type SceneId } from "./sceneFor";

export type SceneEntry = {
  component: React.FC<SceneProps>;
  /** Length of the composition in frames at 30 fps. */
  durationInFrames: number;
  /** First frame of the hold loop; frames before it are the entrance. */
  loopFrom: number;
  /** Human name, for the help overlay and Studio. */
  label: string;
  /** A one-frame Still (for slides), not a loop. */
  still?: boolean;
  /** Reads the meetup archive (ArchiveContext, archive.ts): Studio and the stills pass it as the `archive` prop. */
  archive?: boolean;
};

const HOLD = INTRO_FRAMES + LOOP_FRAMES;

export const SCENES: Record<SceneId, SceneEntry> = {
  PreShow: { component: PreShow, durationInFrames: PRESHOW_FRAMES, loopFrom: 0, label: "Pre-show loop" },
  Welcome: { component: Welcome, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Welcome" },
  WhoWeAre: { component: WhoWeAre, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Who we are" },
  WhatWeDo: { component: WhatWeDo, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "What we do" },
  Members: { component: Members, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Introducing our members" },
  GrowingTogether: { component: GrowingTogether, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Growing together" },
  SponsorHandover: { component: SponsorHandover, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Sponsor handover" },
  SpeakerHandover: { component: SpeakerHandover, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Speaker handover" },
  NowSpeaking: { component: NowSpeaking, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Now speaking" },
  Break: { component: Break, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Break" },
  Closing: { component: Closing, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Closing" },
  AfterEnd: { component: AfterEnd, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "After the end" },
  Agenda: { component: Agenda, durationInFrames: 1, loopFrom: 0, label: "Agenda (still)", still: true },
  Upcoming: { component: Upcoming, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Next AWS Community Day" },
  CommunityDay: { component: CommunityDay, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "A coming community day" },
  OurMeetups: { component: OurMeetups, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Our meetups", archive: true },
  OurSponsors: { component: OurSponsors, durationInFrames: HOLD, loopFrom: INTRO_FRAMES, label: "Our hosts and sponsors", archive: true },
};

/** The segment kind a scene is about by default, for picking a segmentId. */
export const SCENE_KIND: Partial<Record<SceneId, SceneProps["event"]["segments"][number]["kind"]>> = {
  PreShow: "networking",
  Welcome: "welcome",
  WhoWeAre: "welcome",
  WhatWeDo: "welcome",
  Members: "welcome",
  GrowingTogether: "welcome",
  SponsorHandover: "sponsor",
  SpeakerHandover: "talk",
  NowSpeaking: "talk",
  Break: "break",
  Closing: "closing",
};

export { LiveClockProvider, useLiveClock, type LiveClock } from "./clock";

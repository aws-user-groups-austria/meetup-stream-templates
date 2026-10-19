/**
 * One scene in @remotion/player, full screen and letterboxed to 16:9.
 *
 * A scene plays its entrance once and then holds by looping
 * [loopFrom, durationInFrames) from src/scenes.ts, for as long as the run of
 * show stays on it (a closing can last two hours). The Player is given six
 * hours of frames and a small wrapper maps each frame into the scene's own
 * timeline with <Freeze>, so the scene itself never sees a frame it was not
 * designed for. The Player is remounted (by `key`) when the step changes,
 * which restarts the entrance from frame 0.
 *
 * If a scene throws, the Player shows `errorFallback`. Its default is an
 * emoji, so the stage passes a plain-text one in the error screen's style.
 */
import React, { useEffect, useState } from "react";
import { Player, type ErrorFallback } from "@remotion/player";
import { Freeze, useCurrentFrame } from "remotion";
import { FPS, HEIGHT, INTRO_FRAMES, LOOP_FRAMES, WIDTH } from "../../src/theme";
import { C, chrome, mono } from "./chrome";
import type { EventFile } from "../../src/event.schema";
import { SCENES, type SceneId } from "../../src/scenes";
import { sceneFrame } from "./loop";

const HOLD_FRAMES = FPS * 60 * 60 * 6;

type LoopedProps = { sceneId: SceneId; event: EventFile; segmentId?: string; index?: number; held?: boolean };

/**
 * The frames a scene loops through on the stage. A one-frame Still (the
 * Agenda) plays its entrance and then holds like any scene: frozen on its
 * frame 0 inside a six-hour Player, every entrance would stay at nothing.
 * `held` (the meetup page's header, where the pre-show shows only its event
 * card) does the same for a scene that otherwise loops from 0.
 */
export const holdRange = (sceneId: SceneId, held = false): { durationInFrames: number; loopFrom: number } => {
  const entry = SCENES[sceneId];
  return entry.still || (held && entry.loopFrom === 0)
    ? { durationInFrames: INTRO_FRAMES + LOOP_FRAMES, loopFrom: INTRO_FRAMES }
    : { durationInFrames: entry.durationInFrames, loopFrom: entry.loopFrom };
};

const Looped: React.FC<LoopedProps> = ({ sceneId, event, segmentId, index, held }) => {
  const frame = useCurrentFrame();
  const entry = SCENES[sceneId];
  const Scene = entry.component;
  const range = holdRange(sceneId, held);
  return (
    <Freeze frame={sceneFrame(frame, range.durationInFrames, range.loopFrom)}>
      <Scene event={event} segmentId={segmentId} index={index} />
    </Freeze>
  );
};

// The theme, at window scale: see chrome.ts.

/** What the projector shows when a scene throws: the same look as the error screen, no emoji. */
const SceneError: ErrorFallback = ({ error }) => (
  <div
    data-scene-error=""
    style={{
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      background: C.bg,
      color: C.text,
      ...chrome("body"),
      padding: "8% 7%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    <div style={{ ...chrome("label"), color: C.accent }}>Room screen</div>
    <div style={{ ...chrome("title"), margin: "0.4em 0 0.5em" }}>This scene could not be shown</div>
    <div style={{ color: C.secondary }}>Press the right arrow for the next scene, or A to go back to the clock.</div>
    <div style={{ color: C.muted, marginTop: "1em", ...mono("small") }}>{String(error?.message ?? error)}</div>
  </div>
);

/** The largest 16:9 box that fits the window. */
export const useFit = () => {
  const measure = () => {
    const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
    return { width: Math.floor(WIDTH * scale), height: Math.floor(HEIGHT * scale) };
  };
  const [size, setSize] = useState(measure);
  useEffect(() => {
    const onResize = () => setSize(measure());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
};

export const Stage: React.FC<{ stepKey: string } & LoopedProps> = ({ stepKey, sceneId, event, segmentId, index, held }) => {
  const size = useFit();
  const inputProps: LoopedProps = { sceneId, event, ...(segmentId ? { segmentId } : {}), ...(index !== undefined ? { index } : {}), ...(held ? { held } : {}) };
  return (
    <Player
      key={stepKey}
      component={Looped}
      inputProps={inputProps}
      durationInFrames={HOLD_FRAMES}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      style={{ width: size.width, height: size.height }}
      autoPlay
      // Muted, the Player advances on requestAnimationFrame instead of an
      // AudioContext the browser keeps suspended until the first key press,
      // so a page opened straight into the evening plays without a click.
      initiallyMuted
      loop
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      errorFallback={SceneError}
    />
  );
};

/**
 * Embed mode (`/present/?event=<id>&embed=1`): the meetup page's header on
 * awscommunity.at, in an iframe. The tour before and after the evening, the
 * room screen during it, a fixed "Starts in" countdown until doors open (see
 * tour.ts).
 *
 *   - Two screens crossfade (TOUR_UI.fadeMs): the new one fades in over the
 *     old, which stays until it is covered. The scenes draw their chrome
 *     settled here (EmbedProvider), so the logo and countdown stay put.
 *   - The tour shows that it runs: a thin progress line along the top edge
 *     for the screen on view, one dot per screen (click to jump), and a pill
 *     ("Next: Agenda · 6 s", "Back to the tour in 15 s", "Paused", "Live now").
 *   - The pointer on the header pauses it ("Paused"); leaving goes on.
 *   - A click on the stage or a bar chapter is a visit (IDLE_MS), a click on
 *     a link in a scene opens the link and nothing else (components/Linked.tsx).
 *
 * Unlike the room screen: the real clock only (no ?at=, no ?speed=), no keys,
 * no help, no black screen, no host links, no rehearsal badge.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArchiveProvider, type Archive } from "../../src/archive";
import { EmbedProvider, type Embed } from "../../src/embed";
import type { EventFile } from "../../src/event.schema";
import { LiveClockProvider } from "../../src/scenes";
import { BAR, GRID, HEIGHT, RADIUS, TOUR_UI } from "../../src/theme";
import { C, FONT } from "./chrome";
import { Stage, useFit } from "./Stage";
import { headerView, jumpTo, pillText, startState, tickHeader, tourAt, visitNext, visitSegment, type HeaderState, type HeaderView, type TourStop } from "./tour";

const TICK_MS = 250;
/** The links go to this origin's pages: the header is an iframe on the website itself. */
const EMBED: Embed = { site: "" };

type Layer = { id: number; key: string; sceneId: HeaderView["sceneId"]; segmentId?: string; index?: number };

const KEYFRAMES = `@keyframes meetup-header-in { from { opacity: 0 } to { opacity: 1 } }`;

/** Pill text in window px: small, never under TOUR_UI.pillMin. */
const pillFont = `clamp(${TOUR_UI.pillMin}px, ${TOUR_UI.pillVw}vw, ${TOUR_UI.pillMax}px)`;

/** The centre of the logo band, where the pill and the dots sit (between the logo and the countdown). */
const BAND_Y = `${(((GRID.bandTop + GRID.bandBottom) / 2 / HEIGHT) * 100).toFixed(2)}%`;

const Dots: React.FC<{ tour: TourStop[]; on: number | null; onJump: (i: number) => void }> = ({ tour, on, onJump }) => {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div data-dots={tour.length} style={{ display: "flex", alignItems: "center" }}>
      {tour.map((s, i) => {
        const current = i === on;
        const lit = current || hover === i;
        return (
          <button
            key={`${s.sceneId}-${s.segment?.id ?? ""}-${s.index ?? ""}`}
            type="button"
            data-dot={i}
            data-current={current ? "" : undefined}
            title={s.label}
            aria-label={`Show ${s.label}`}
            onClick={(e) => {
              e.stopPropagation();
              onJump(i);
            }}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            style={{ all: "unset", cursor: "pointer", height: TOUR_UI.dotHit, padding: `0 ${TOUR_UI.dotGap / 2}px`, display: "flex", alignItems: "center" }}
          >
            <span
              style={{
                display: "block",
                width: current ? TOUR_UI.dotOn : TOUR_UI.dot,
                height: TOUR_UI.dot,
                borderRadius: RADIUS.pill,
                background: current ? C.accent : hover === i ? C.text : C.muted,
                opacity: lit ? 1 : 0.55,
                boxShadow: hover === i ? `0 0 0 2px ${C.accentGlow}` : "none",
                transform: hover === i && !current ? "scale(1.35)" : "none",
                transition: "width 300ms ease, background-color 160ms ease, opacity 160ms ease, transform 160ms ease",
              }}
            />
          </button>
        );
      })}
    </div>
  );
};

/** The tour's own chrome over the stage: the progress line, the pill and the dots. Never part of a scene. */
const TourChrome: React.FC<{
  view: HeaderView;
  tour: TourStop[];
  paused: boolean;
  onJump: (i: number) => void;
  onBack: () => void;
}> = ({ view, tour, paused, onJump, onBack }) => {
  const text = pillText(view, paused);
  const visiting = view.source === "visit";
  const live = view.source === "live";
  // A new stop starts the line at zero instead of sliding back: keyed by what is on screen.
  const lineKey = `${view.source}-${view.sceneId}-${view.segment?.id ?? ""}-${view.index ?? ""}`;
  return (
    <>
      {live ? null : (
        <div data-progress={view.progress.toFixed(2)} style={{ position: "absolute", left: 0, right: 0, top: 0, height: TOUR_UI.progress, background: TOUR_UI.progressTrack, zIndex: 10, pointerEvents: "none" }}>
          <div
            key={lineKey}
            style={{
              height: "100%",
              width: `${(view.progress * 100).toFixed(2)}%`,
              background: visiting ? C.secondary : BAR.fill,
              boxShadow: `0 0 8px ${BAR.fillGlow}`,
              transition: paused ? "none" : `width ${TICK_MS}ms linear`,
            }}
          />
        </div>
      )}
      <div
        data-tour-chrome=""
        style={{
          position: "absolute",
          left: "50%",
          top: BAND_Y,
          transform: "translate(-50%, -50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          fontFamily: FONT,
          maxWidth: "56%",
        }}
      >
        {text ? (
          <button
            type="button"
            data-pill={text}
            onClick={(e) => {
              e.stopPropagation();
              if (visiting) onBack();
            }}
            title={visiting ? "Back now" : undefined}
            style={{
              all: "unset",
              cursor: visiting ? "pointer" : "default",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45em",
              padding: "0.28em 0.8em",
              borderRadius: RADIUS.pill,
              background: TOUR_UI.pillBg,
              border: `1px solid ${paused || visiting ? C.accent : C.border}`,
              color: C.text,
              fontFamily: FONT,
              fontSize: pillFont,
              fontWeight: 700,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
              backdropFilter: "blur(4px)",
              transition: "border-color 160ms ease",
            }}
          >
            <span aria-hidden="true" style={{ width: "0.5em", height: "0.5em", borderRadius: RADIUS.pill, background: paused ? C.warning : C.accent, boxShadow: `0 0 6px ${C.accentGlow}`, flex: "0 0 auto" }} />
            {text}
          </button>
        ) : null}
        {!live && tour.length > 1 ? <Dots tour={tour} on={view.stopIndex} onJump={onJump} /> : null}
      </div>
    </>
  );
};

export const EmbedShow: React.FC<{ event: EventFile; archive: Archive | null }> = ({ event, archive }) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [state, setState] = useState<HeaderState>(startState);
  const [paused, setPaused] = useState(false);
  const beforeDoors = nowMs < Date.parse(event.doorsOpen);
  const afterEnd = nowMs >= Date.parse(event.end);
  // The tour changes only with the phase (and the archive arriving), not on every tick.
  const tour = useMemo(() => tourAt(event, nowMs, archive), [event, archive, beforeDoors, afterEnd]);
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      setNowMs(now);
      setState((s) => tickHeader(tourRef.current, s, dt, pausedRef.current));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  // A new phase (doors open, the evening ends) starts its tour from the top.
  useEffect(() => setState(startState()), [beforeDoors, afterEnd]);

  const view = headerView(event, nowMs, tour, state);
  const viewRef = useRef(view);
  viewRef.current = view;

  const goToSegment = useCallback(
    (segmentId: string) => setState((s) => ({ ...s, visit: visitSegment(event, tourRef.current, s, segmentId) ?? s.visit })),
    [event],
  );
  const clock = useMemo(
    () => ({ nowMs, running: view.source !== "visit", goToSegment, schedule: event, ...(view.countdown ? { fixedCountdown: view.countdown } : {}) }),
    [nowMs, view.source, view.countdown?.targetMs, goToSegment, event],
  );

  // The screens on the stage: the current one, and the one before while the new one fades in over it.
  const key = `${view.sceneId}:${view.segment?.id ?? ""}:${view.index ?? ""}`;
  const layerFor = (id: number): Layer => ({ id, key, sceneId: view.sceneId, ...(view.segment ? { segmentId: view.segment.id } : {}), ...(view.index !== undefined ? { index: view.index } : {}) });
  const [layers, setLayers] = useState<Layer[]>(() => [layerFor(0)]);
  const nextId = useRef(1);
  useEffect(() => {
    const layer = layerFor(nextId.current++);
    setLayers((ls) => (ls.at(-1)?.key === key ? ls : [...ls.slice(-1), layer]));
  }, [key]);
  useEffect(() => {
    if (layers.length < 2) return;
    const t = window.setTimeout(() => setLayers((ls) => ls.slice(-1)), TOUR_UI.fadeMs + 150);
    return () => window.clearTimeout(t);
  }, [layers]);

  const size = useFit();
  const isMouse = (e: React.PointerEvent) => e.pointerType === "mouse";

  return (
    <EmbedProvider value={EMBED}>
      <ArchiveProvider value={archive}>
        <LiveClockProvider value={clock}>
          <style>{KEYFRAMES}</style>
          <div
            data-embed=""
            data-scene={view.sceneId}
            data-segment={view.segment?.id ?? ""}
            data-source={view.source}
            data-phase={view.phase}
            data-paused={paused ? "" : undefined}
            onClick={() => {
              // Computed here, not in the updater: React may run an updater twice, after a render moved viewRef on.
              const visit = visitNext(event, tourRef.current, viewRef.current);
              setState((st) => ({ ...st, visit }));
            }}
            onPointerEnter={(e) => isMouse(e) && setPaused(true)}
            onPointerLeave={(e) => isMouse(e) && setPaused(false)}
            style={{ width: "100vw", height: "100vh", background: C.bg, display: "grid", placeItems: "center", overflow: "hidden", cursor: "pointer" }}
          >
            <div style={{ position: "relative", width: size.width, height: size.height, overflow: "hidden" }}>
              {layers.map((l, i) => (
                <div
                  key={l.id}
                  data-layer={l.key}
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 1 + i,
                    animation: l.id === 0 ? undefined : `meetup-header-in ${TOUR_UI.fadeMs}ms ease-out both`,
                    // The screen going away takes no clicks or hovers.
                    pointerEvents: i === layers.length - 1 ? "auto" : "none",
                  }}
                >
                  <Stage stepKey={l.key} sceneId={l.sceneId} event={event} segmentId={l.segmentId} index={l.index} held />
                </div>
              ))}
              <TourChrome
                view={view}
                tour={tour}
                paused={paused}
                onJump={(i) => setState(jumpTo(tourRef.current, i))}
                onBack={() => setState((s) => (s.visit ? tickHeader(tourRef.current, { ...s, visit: { ...s.visit, leftMs: 0 } }, 0, false) : s))}
              />
            </div>
          </div>
        </LiveClockProvider>
      </ArchiveProvider>
    </EmbedProvider>
  );
};

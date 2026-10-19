/**
 * The run of show: loads the event, runs the clock, picks the scene, and
 * handles the host's keys.
 *
 *   →  PgDn  Space   next scene        ←  PgUp   previous scene
 *   A   back to the clock               F   fullscreen
 *   B   black screen                    ?   help (mode, clock, segments)
 *   +   running late: the rest of the evening one minute later
 *   -   one minute earlier              0   back to the agenda's times
 *   click   next scene; click a chapter in the bottom bar: jump to that segment
 *
 * Clickers send PgDn/PgUp. The clock ticks every 250 ms and reaches the
 * scenes only through LiveClockProvider; ?at= and ?speed= are shown in the
 * help overlay and nowhere else.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EventFile } from "../../src/event.schema";
import { segmentLabel, speakerNames } from "../../src/model";
import { LiveClockProvider, SCENES } from "../../src/scenes";
import { formatCountdown, localRange, localTime } from "../../src/time";
import { applyShifts, DELAY_STEP_MS, formatDelay, totalDelayMs, type Shift } from "./delay";
import { loadArchive, loadEvent, type LoadError } from "./loadEvent";
import type { Archive } from "../../src/archive";
import { clockNow, readRehearsal, rehearsalLabel, viennaClock, viennaDay, type Rehearsal } from "./rehearsal";
import { jumpToSegment, offsetFor, resolvePin, runOfShow, step, type Pin, type Show } from "./runOfShow";
import { Stage } from "./Stage";
import { EmbedShow } from "./Embed";
import { C, chrome, mono } from "./chrome";
import { LinkPill, PlayerLinks, linksFor } from "./links";

const TICK_MS = 250;

const NEXT = ["ArrowRight", "PageDown", "Space"];
const PREV = ["ArrowLeft", "PageUp"];
/** By e.key, so they work on any keyboard layout and on the number pad. */
const LATER = ["+", "="];
const EARLIER = ["-", "_"];

/** F. Never throws: a browser without the Fullscreen API, or one that refuses, leaves the window as it is. */
const toggleFullscreen = (): void => {
  try {
    const result = document.fullscreenElement
      ? document.exitFullscreen?.()
      : document.documentElement.requestFullscreen?.();
    if (result && typeof result.catch === "function") result.catch(() => undefined);
  } catch {
    // Not available here; the show goes on.
  }
};

// The scenes' theme (../../src/theme.ts), scaled to the window: see chrome.ts.

// ------------------------------------------------------------------ errors

/** A data: URL or a very long address would push everything else off the screen. */
const shortUrl = (url: string): string =>
  url.startsWith("data:") ? `a data: URL (${url.length} characters)` : url.length > 240 ? `${url.slice(0, 240)}...` : url;

/** Sized to the window, so it reads on the projector as well as on the laptop. */
const ErrorScreen: React.FC<{ error: LoadError }> = ({ error }) => (
  <div
    data-error={error.title}
    style={{
      height: "100%",
      boxSizing: "border-box",
      background: C.bg,
      color: C.text,
      ...chrome("body"),
      padding: "8vh 7vw",
      overflow: "auto",
    }}
  >
    <div style={{ ...chrome("label"), color: C.accent }}>Room screen</div>
    <h1 style={{ ...chrome("title"), margin: "0.4em 0 0.5em" }}>{error.title}</h1>
    <p style={{ color: C.secondary, maxWidth: "44em", margin: 0 }}>{error.detail}</p>
    {error.issues.length > 0 ? (
      <ul style={{ marginTop: "1.2em", paddingLeft: "1.2em", color: C.secondary, ...mono("small") }}>
        {error.issues.slice(0, 30).map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
        {error.issues.length > 30 ? <li>and {error.issues.length - 30} more</li> : null}
      </ul>
    ) : null}
    {error.url ? (
      <p style={{ color: C.muted, marginTop: "1em", wordBreak: "break-all" }}>
        Address: <code style={{ color: C.secondary }}>{shortUrl(error.url)}</code>
      </p>
    ) : null}
  </div>
);

// ------------------------------------------------------------------ help

const segmentLine = (s: EventFile["segments"][number] | undefined): string =>
  s ? `${segmentLabel(s)} (${localRange(s.start, s.end)})${speakerNames(s) ? `, ${speakerNames(s)}` : ""}` : "none";

const Help: React.FC<{
  show: Show;
  nowMs: number;
  rehearsal: Rehearsal;
  event: EventFile;
  shifts: readonly Shift[];
  onClose: () => void;
}> = ({ show, nowMs, rehearsal, event, shifts, onClose }) => {
  const delayMs = totalDelayMs(shifts);
  const byClock = show.steps[show.autoIndex]!;
  const rows: [string, React.ReactNode][] = [
    [
      "Mode",
      show.mode === "auto"
        ? "Auto: following the clock"
        : `Manual: ${Math.abs(show.index - show.autoIndex)} step${Math.abs(show.index - show.autoIndex) === 1 ? "" : "s"} ${show.index > show.autoIndex ? "ahead of" : "behind"} the clock. A goes back.`,
    ],
    [
      "Clock",
      <>
        {viennaDay(nowMs)}, {viennaClock(nowMs)} Vienna
        {rehearsal.atMs !== null || rehearsal.speed !== 1 ? (
          <span style={{ color: C.accent }}>
            {"  "}rehearsal{rehearsal.atText ? `, started at ${rehearsal.atText}` : ""}
            {rehearsal.speed !== 1 ? `, ${rehearsal.speed}x speed` : ""}
          </span>
        ) : (
          <span style={{ color: C.muted }}>  real time</span>
        )}
      </>,
    ],
    [
      "Delay",
      delayMs === 0 && shifts.length === 0 ? (
        <span style={{ color: C.muted }}>on time (+ and - move the rest of the evening by a minute)</span>
      ) : (
        <>
          <span style={{ color: delayMs === 0 ? C.secondary : C.accent }}>{formatDelay(delayMs)}</span>
          {`  remaining segments moved, end stays ${localTime(event.end)}. 0 resets.`}
        </>
      ),
    ],
    ["On screen", `${SCENES[show.sceneId].label}${show.phase === "before-doors" ? " (before doors open)" : ""}`],
    [
      "Segment",
      !show.segment && show.phase === "before-doors" ? `none yet, doors open at ${localTime(event.doorsOpen)}` : segmentLine(show.segment),
    ],
    ...(show.mode === "manual"
      ? ([["By the clock", `${SCENES[byClock.sceneId].label}: ${segmentLine(byClock.segment)}`]] as [string, React.ReactNode][])
      : []),
    [
      "Next scene",
      show.next
        ? show.next.manual
          ? `${SCENES[show.next.sceneId].label}, on the next key press${show.nextAuto ? `; by the clock ${SCENES[show.nextAuto.sceneId].label} at ${viennaClock(show.nextAuto.startMs)}${show.remainingMs !== null && show.remainingMs > 0 ? `, in ${formatCountdown(show.remainingMs)}` : ""}` : ""}`
          : `${SCENES[show.next.sceneId].label} at ${viennaClock(show.next.startMs)}${show.remainingMs !== null && show.remainingMs > 0 ? `, in ${formatCountdown(show.remainingMs)}` : ""}`
        : "none, this is the last one",
    ],
    ["Next segment", segmentLine(show.nextSegment)],
    [
      "Links",
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "0.5em" }}>
        {linksFor(event).map((l) => (
          <LinkPill key={l.label} link={l} />
        ))}
      </span>,
    ],
  ];
  const keys: [string, string][] = [
    ["→  PgDn  Space  click", "next scene"],
    ["←  PgUp", "previous scene"],
    ["A", "back to the clock"],
    ["F", "fullscreen"],
    ["B", "black screen"],
    ["+  -", "running late: rest of the evening a minute later, earlier"],
    ["0", "back to the agenda's times"],
    ["?", "this help"],
    ["click a chapter", "jump to it (bottom bar)"],
  ];
  return (
    <div
      data-help=""
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "grid",
        placeItems: "center",
        background: C.overlay,
        color: C.text,
        // Label size in normal case: the whole overlay fits one 1080 px screen without scrolling.
        ...chrome("label", 400),
        textTransform: "none",
        letterSpacing: 0,
        lineHeight: 1.45,
        overflow: "auto",
      }}
    >
      <div style={{ maxWidth: "62em", padding: "2em 2.4em" }}>
        <div style={{ ...chrome("label"), color: C.accent }}>Run of show</div>
        <h2 style={{ ...chrome("heading"), margin: "0.4em 0 0.8em" }}>{event.title}</h2>
        <table style={{ borderSpacing: "0 6px", marginBottom: 28 }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td style={{ color: C.muted, paddingRight: 28, verticalAlign: "top", whiteSpace: "nowrap" }}>{k}</td>
                <td style={{ color: C.secondary }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* The keys in two columns, so the whole overlay fits one screen. */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", columnGap: "1.4em", rowGap: "0.25em", alignItems: "baseline" }}>
          {keys.map(([k, v]) => (
            <React.Fragment key={k}>
              <div style={{ ...mono("label"), color: C.accent, whiteSpace: "nowrap" }}>{k}</div>
              <div style={{ color: C.secondary }}>{v}</div>
            </React.Fragment>
          ))}
        </div>
        {rehearsal.warnings.map((w) => (
          <p key={w} style={{ color: C.warning, margin: "0.8em 0 0" }}>
            {w}
          </p>
        ))}
        <p style={{ color: C.muted, margin: "1.2em 0 0", fontSize: "0.85em" }}>
          Rehearse with ?at=18:49 and ?speed=10. Doors {localTime(event.doorsOpen)}, end {localTime(event.end)}. Click
          anywhere to close.
        </p>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ the show

/**
 * Always on screen while the clock is not the real one (?at= or ?speed=): a
 * pill at the top centre with the speed, the start time and the simulated
 * clock, so nobody takes a 10x countdown for a broken one. Never in a real
 * evening, and it does not take clicks (a click still steps forward).
 */
const RehearsalBadge: React.FC<{ rehearsal: Rehearsal; nowMs: number }> = ({ rehearsal, nowMs }) => {
  const label = rehearsalLabel(rehearsal);
  if (!label) return null;
  return (
    <div
      data-rehearsal={label}
      style={{
        position: "fixed",
        top: "1.2vh",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: "0.8em",
        padding: "0.45em 1.1em",
        borderRadius: 999,
        background: "rgba(10, 14, 22, 0.82)",
        border: `1px solid ${C.accent}`,
        color: C.text,
        pointerEvents: "none",
        zIndex: 20,
        whiteSpace: "nowrap",
        ...chrome("label"),
      }}
    >
      <span style={{ color: C.accent }}>Rehearsal</span>
      {rehearsal.speed !== 1 ? <span>{rehearsal.speed}x speed</span> : null}
      {rehearsal.atText ? <span style={{ color: C.muted }}>from {rehearsal.atText}</span> : null}
      <span style={{ ...mono("label"), color: C.text }}>{viennaClock(nowMs)}</span>
    </div>
  );
};

const RunOfShow: React.FC<{ event: EventFile }> = ({ event: loaded }) => {
  const rehearsal = useMemo(() => readRehearsal(window.location.search, loaded.doorsOpen), [loaded.doorsOpen]);
  const loadedAt = useRef(Date.now());
  const now = useCallback(() => clockNow(rehearsal, loadedAt.current, Date.now()), [rehearsal]);
  const [nowMs, setNowMs] = useState(now);
  const [pin, setPin] = useState<Pin | null>(null);
  const [black, setBlack] = useState(false);
  const [help, setHelp] = useState(false);
  const [idle, setIdle] = useState(false);
  // + and -: the agenda as it is running tonight. Kept in memory only; a reload goes back to the page times.
  const [shifts, setShifts] = useState<Shift[]>([]);
  const event = useMemo(() => applyShifts(loaded, shifts), [loaded, shifts]);

  // Faster rehearsals tick more often, so the countdown counts through its seconds instead of jumping.
  const tickMs = rehearsal.speed > 1 ? Math.max(40, Math.round(TICK_MS / rehearsal.speed)) : TICK_MS;
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(now()), tickMs);
    return () => window.clearInterval(id);
  }, [now, tickMs]);

  // An early "next" is released once the clock gets there.
  useEffect(() => {
    if (pin && resolvePin(event, nowMs, pin) === null) setPin(null);
  }, [event, nowMs, pin]);

  const go = useCallback((delta: number) => setPin((p) => step(event, now(), p, delta)), [event, now]);
  // A click on a chapter in the scenes' bottom bar.
  const goToSegment = useCallback((segmentId: string) => setPin(jumpToSegment(event, now(), segmentId)), [event, now]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelp((h) => !h);
        return;
      }
      if (NEXT.includes(e.code)) {
        e.preventDefault();
        go(1);
        return;
      }
      if (PREV.includes(e.code)) {
        e.preventDefault();
        go(-1);
        return;
      }
      if (e.code === "KeyA") {
        e.preventDefault();
        setPin(null);
        return;
      }
      if (e.code === "KeyB") {
        e.preventDefault();
        setBlack((b) => !b);
        return;
      }
      if (e.code === "KeyF") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (LATER.includes(e.key) || EARLIER.includes(e.key)) {
        e.preventDefault();
        const deltaMs = LATER.includes(e.key) ? DELAY_STEP_MS : -DELAY_STEP_MS;
        setShifts((list) => [...list, { atMs: now(), deltaMs }]);
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        setShifts([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, now]);

  // The pointer disappears after a moment, so it does not sit on the projector.
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), 2500);
    const onMove = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), 2500);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  const show = runOfShow(event, nowMs, offsetFor(event, nowMs, pin));
  // The countdown top right counts to the published times (`loaded`), not the +/- shifted ones,
  // and reads the clock only: the presenter's keys never change it.
  const clock = useMemo(() => ({ nowMs, running: show.mode === "auto", goToSegment, schedule: loaded }), [nowMs, show.mode, goToSegment, loaded]);
  // The scene is about step.segment (doors on the pre-show even before doors open).
  const onScreen = show.step.segment;
  const stepKey = `${show.index}-${show.sceneId}-${onScreen?.id ?? "none"}`;

  return (
    <LiveClockProvider value={clock}>
      <div
        data-scene={show.sceneId}
        data-segment={onScreen?.id ?? ""}
        data-mode={show.mode}
        data-delay-min={Math.round(totalDelayMs(shifts) / 60_000)}
        data-black={black ? "" : undefined}
        onClick={() => go(1)}
        style={{
          width: "100vw",
          height: "100vh",
          background: C.black,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          cursor: idle || black ? "none" : "default",
        }}
      >
        {black ? null : <Stage stepKey={stepKey} sceneId={show.sceneId} event={event} segmentId={onScreen?.id} />}
      </div>
      <PlayerLinks event={event} />
      <RehearsalBadge rehearsal={rehearsal} nowMs={nowMs} />
      {help ? <Help show={show} nowMs={nowMs} rehearsal={rehearsal} event={event} shifts={shifts} onClose={() => setHelp(false)} /> : null}
    </LiveClockProvider>
  );
};

const isEmbed = (): boolean => new URLSearchParams(window.location.search).get("embed") === "1";

export const App: React.FC = () => {
  const [state, setState] = useState<{ event: EventFile } | { error: LoadError } | null>(null);
  // The meetup archive, for the header's "Our meetups" and "Our hosts and sponsors"; optional, embed only.
  const [archive, setArchive] = useState<Archive | null>(null);
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("event");
    let cancelled = false;
    if (isEmbed()) loadArchive(window.location.href).then((a) => !cancelled && setArchive(a));
    loadEvent(param, window.location.href).then((r) => {
      if (cancelled) return;
      setState(r.ok ? { event: r.event } : { error: r.error });
      if (r.ok) document.title = `${r.event.title} | ${rehearsalLabel(readRehearsal(window.location.search, r.event.doorsOpen)) ?? "room screen"}`;
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!state) return <div data-loading="" style={{ height: "100%", background: C.black }} />;
  if ("error" in state) return <ErrorScreen error={state.error} />;
  // ?embed=1: the meetup page's header (Embed.tsx), not the room screen.
  if (isEmbed()) return <EmbedShow event={state.event} archive={archive} />;
  return <RunOfShow event={state.event} />;
};

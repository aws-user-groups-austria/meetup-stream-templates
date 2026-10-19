/**
 * The one agenda of the screens (the Agenda still, the pre-show panel, the
 * second half of the Welcome): rows divided by hairlines, the start time in
 * a column of its own in the accent, the title (talks bold and white, the
 * rest regular and secondary), the speakers of a talk under its title in
 * Small. The current item, when there is one, on a soft accent band with an
 * accent bar. Rows at Body, or Small when Body does not fit; the speakers go
 * before the type gets smaller than Small, and a list that still does not fit
 * shows a window of rows around the current one.
 *
 * AgendaPage is the screen around it: the page head (date and venue,
 * "Tonight's agenda") and the list, sized to the stage.
 */
import React from "react";
import type { EventFile, Segment } from "../event.schema";
import { STAGGER } from "../design/anim";
import { estimateLines } from "../design/fit";
import { AGENDA, clampLines, COLORS, CONTENT_W, LINK, RADIUS, SPACE, STAGE_H, TYPE, type } from "../theme";
import { segmentLabel, speakerNames } from "../model";
import { localDate, localTime } from "../time";
import { agendaHref } from "../embed";
import { Enter } from "./Enter";
import { Linked } from "./Linked";
import { PageHead } from "./PageHead";

type Size = "body" | "small";

const timeWidth = (size: Size) => Math.ceil(TYPE[size].size * AGENDA.timeEm);
const textWidth = (size: Size, width: number) => width - AGENDA.padX * 2 - AGENDA.colGap - timeWidth(size);
const lineH = (size: Size) => TYPE[size].size * TYPE[size].lineHeight;

/** Estimated pixel height of one row, mirroring the styles below (1 px rule included); a title takes at most two lines. */
const rowHeight = (s: Segment, size: Size, width: number, speakers: boolean): number => {
  const w = textWidth(size, width);
  const lines = Math.min(2, estimateLines(segmentLabel(s), TYPE[size].size, w));
  const names = speakers ? speakerNames(s) : "";
  const sub = names ? lineH("small") * Math.min(2, estimateLines(names, TYPE.small.size, w)) : 0;
  return AGENDA.padY * 2 + 1 + lines * lineH(size) + sub;
};

/** Fit an agenda into `height`: Body with speakers, Small with speakers, Small without; then a window of rows. */
export const fitAgenda = (
  segments: Segment[],
  opts: { width: number; height: number; speakers?: boolean; highlightId?: string },
): { size: Size; speakers: boolean; from: number; to: number } => {
  const total = (list: Segment[], size: Size, sp: boolean) => list.reduce((h, s) => h + rowHeight(s, size, opts.width, sp), 0);
  const tries: [Size, boolean][] = opts.speakers === false ? [["body", false], ["small", false]] : [["body", true], ["small", true], ["small", false]];
  for (const [size, sp] of tries) {
    if (total(segments, size, sp) <= opts.height) return { size, speakers: sp, from: 0, to: segments.length };
  }
  const size: Size = "small";
  const centre = Math.max(0, segments.findIndex((s) => s.id === opts.highlightId));
  let from = centre;
  let to = centre + 1;
  for (;;) {
    const grewDown = to < segments.length && total(segments.slice(from, to + 1), size, false) <= opts.height;
    if (grewDown) to += 1;
    const grewUp = from > 0 && total(segments.slice(from - 1, to), size, false) <= opts.height;
    if (grewUp) from -= 1;
    if (!grewDown && !grewUp) break;
  }
  return { size, speakers: false, from, to };
};

export const AgendaList: React.FC<{
  event: EventFile;
  highlightId?: string;
  /** The speakers under each talk (default); false leaves them out. */
  speakers?: boolean;
  delay?: number;
  width: number;
  height: number;
}> = ({ event, highlightId, speakers = true, delay = 0, width, height }) => {
  const fit = fitAgenda(event.segments, { width, height, speakers, highlightId });
  const rows = event.segments.slice(fit.from, fit.to);
  const onIndex = rows.findIndex((s) => s.id === highlightId);
  return (
    <div data-agenda={fit.size} style={{ display: "flex", flexDirection: "column", width }}>
      {rows.map((s, i) => {
        const on = i === onIndex;
        const talk = s.kind === "talk";
        const names = fit.speakers ? speakerNames(s) : "";
        // No rule above the first row, the current row or the row after it: the band separates them.
        const rule = i > 0 && !on && i !== onIndex + 1;
        return (
          <Enter key={s.id} delay={delay + i * 3} distance={16}>
            <Linked to={(embed) => agendaHref(embed, event, s.id)} label={`${segmentLabel(s)}: details on the meetup page`} offset={LINK.offsetTight}>
            <div
              data-agenda-row={s.id}
              data-current={on ? "" : undefined}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: AGENDA.colGap,
                padding: `${AGENDA.padY}px ${AGENDA.padX}px`,
                borderTop: `1px solid ${rule ? COLORS.hairline : "transparent"}`,
                borderRadius: on ? RADIUS.md : 0,
                backgroundColor: on ? COLORS.accentSoft : "transparent",
                boxShadow: on ? `inset ${AGENDA.bar}px 0 0 ${COLORS.accent}` : "none",
              }}
            >
              <div style={{ ...type(fit.size, 700), width: timeWidth(fit.size), flex: "0 0 auto", color: on ? COLORS.text : COLORS.accent, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {localTime(s.start)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <div style={{ ...type(fit.size, talk || on ? 700 : 400), color: talk || on ? COLORS.text : COLORS.secondary, ...clampLines(2) }}>{segmentLabel(s)}</div>
                {names ? <div style={{ ...type("small", 400), color: on ? COLORS.secondary : COLORS.muted, ...clampLines(2) }}>{names}</div> : null}
              </div>
            </div>
            </Linked>
          </Enter>
        );
      })}
    </div>
  );
};

/** The page head's height: eyebrow, the gap, one line of Title. */
export const AGENDA_HEAD_H = Math.ceil(TYPE.label.size * TYPE.label.lineHeight + SPACE.sm + TYPE.title.size * TYPE.title.lineHeight);
/** Between the head and the list. */
const HEAD_GAP = SPACE.xl;
/** What the list may take of a stage: the head and its gap out, and SPACE.x2 of the stage left empty. */
export const agendaListHeight = (stageH: number = STAGE_H): number => stageH - SPACE.x2 - AGENDA_HEAD_H - HEAD_GAP;

/** The agenda screen: date and venue, "Tonight's agenda", the list; `highlightId` the part that is on. */
export const AgendaPage: React.FC<{ event: EventFile; highlightId?: string; width?: number; stageH?: number; delay?: number }> = ({
  event,
  highlightId,
  width = CONTENT_W,
  stageH = STAGE_H,
  delay = 0,
}) => (
  <div data-agenda-page="" style={{ display: "flex", flexDirection: "column", gap: HEAD_GAP, width }}>
    <PageHead overline={`${localDate(event.doorsOpen)} · ${event.venue.name}`} title="Tonight's agenda" lines={1} delay={delay} />
    <AgendaList event={event} highlightId={highlightId} delay={delay + STAGGER * 2} width={width} height={agendaListHeight(stageH)} />
  </div>
);

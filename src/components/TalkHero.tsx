/**
 * A talk on screen, the SpeakerHandover ("Next up") and the NowSpeaking hold
 * ("Now speaking") alike: the eyebrow with the time, the talk title, the
 * speakers large with their photos from event.json.
 *   one speaker   the XL photo beside the head, the name and role under the title
 *   two           the head over the two speakers side by side, L photos
 *   three or more the head over a row of centred cards, M photos
 * The speakers' names share one token, the largest at which every name fits
 * on one line.
 */
import React from "react";
import type { EventFile, Segment } from "../event.schema";
import { STAGGER } from "../design/anim";
import { fitToken } from "../design/fit";
import { useEmber } from "../design/fonts";
import { boldWidth } from "../design/metrics";
import { clampLines, COLORS, CONTENT_W, GROUP_GAP, PHOTO, SPACE, SPLIT_GAP, TYPE, type, type TypeName } from "../theme";
import { roleAt, segmentLabel } from "../model";
import { localRange } from "../time";
import { agendaHref, speakerHref } from "../embed";
import { Avatar } from "./Avatar";
import { Linked } from "./Linked";
import { Enter } from "./Enter";
import { Eyebrow } from "./Eyebrow";
import { Speaker } from "./Speaker";

const Head: React.FC<{ event: EventFile; overline: string; segment: Segment; title: string; width: number; lines: number; align?: "left" | "center" }> = ({ event, overline, segment, title, width, lines, align = "left" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", textAlign: align }}>
    <Enter>
      <div style={{ display: "flex", alignItems: "center", gap: SPACE.lg }}>
        <Eyebrow>{overline}</Eyebrow>
        <div style={{ ...type("label"), color: COLORS.muted, fontVariantNumeric: "tabular-nums" }}>{localRange(segment.start, segment.end)}</div>
      </div>
    </Enter>
    <Enter delay={STAGGER}>
      <Linked to={(embed) => agendaHref(embed, event, segment.id)} label={`${title}: the talk on the meetup page`}>
      <div data-talk-title="" style={{ ...type(fitToken(title, width, lines, ["title", "heading"])), marginTop: SPACE.sm, maxWidth: width, textWrap: "balance", ...clampLines(lines) }}>
        {title}
      </div>
      </Linked>
    </Enter>
  </div>
);

/** The largest of `tokens` at which every name fits `width` on one line; the last one otherwise. */
const sharedNameToken = (names: string[], width: number, tokens: TypeName[], ember: boolean): TypeName =>
  tokens.find((t) => names.every((n) => boldWidth(n, TYPE[t].size, ember) <= width)) ?? tokens[tokens.length - 1]!;

export const TalkHero: React.FC<{ event: EventFile; segment: Segment; overline: string }> = ({ event, segment, overline }) => {
  const ember = useEmber();
  const title = segmentLabel(segment);
  const speakers = (segment.talk?.speakers ?? []).slice(0, 4);

  if (speakers.length === 1) {
    const sp = speakers[0]!;
    const textW = CONTENT_W - PHOTO.xl - SPLIT_GAP;
    const role = roleAt(event, sp);
    return (
      <div data-talk-hero="1" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: SPLIT_GAP, width: CONTENT_W }}>
        <Enter delay={STAGGER * 2} distance={32}>
          <Linked to={(embed) => speakerHref(embed, event, sp.name)} label={`${sp.name} on the meetup page`} round>
            <Avatar name={sp.name} photo={sp.photo} size="xl" />
          </Linked>
        </Enter>
        <div style={{ maxWidth: textW, display: "flex", flexDirection: "column", gap: GROUP_GAP }}>
          <Head event={event} overline={overline} segment={segment} title={title} width={textW} lines={3} />
          <Enter delay={STAGGER * 3}>
            <Linked to={(embed) => speakerHref(embed, event, sp.name)} label={`${sp.name} on the meetup page`} style={{ display: "inline-block" }}>
            <div data-speaker={sp.name} style={{ ...type(sharedNameToken([sp.name], textW, ["heading", "lead"], ember)), ...clampLines(2) }}>{sp.name}</div>
            {role ? <div style={{ ...type("body"), color: COLORS.secondary, marginTop: SPACE.xs, ...clampLines(2) }}>{role}</div> : null}
            </Linked>
          </Enter>
        </div>
      </div>
    );
  }

  const many = speakers.length > 2;
  const perRow = Math.max(1, speakers.length);
  const cellW = Math.floor((CONTENT_W - GROUP_GAP * (perRow - 1)) / perRow);
  const photo = many ? "m" : "l";
  const nameW = many ? cellW : cellW - PHOTO[photo] - SPACE.lg;
  const names = speakers.map((s) => s.name);
  const nameToken = many ? sharedNameToken(names, nameW, ["lead", "body"], ember) : sharedNameToken(names, nameW, ["heading", "lead", "body"], ember);
  return (
    <div data-talk-hero={speakers.length} style={{ display: "flex", flexDirection: "column", gap: GROUP_GAP, width: CONTENT_W }}>
      <Head event={event} overline={overline} segment={segment} title={title} width={CONTENT_W} lines={2} align={speakers.length === 0 ? "center" : "left"} />
      {speakers.length > 0 ? (
        <div style={{ display: "flex", gap: GROUP_GAP, justifyContent: many ? "center" : "flex-start" }}>
          {speakers.map((sp, i) => (
            <Enter key={sp.name} delay={STAGGER * (2 + i)} distance={32}>
              <Speaker event={event} speaker={sp} photo={photo} width={cellW} stacked={many} names={[nameToken]} role={many ? "small" : "body"} />
            </Enter>
          ))}
        </div>
      ) : null}
    </div>
  );
};

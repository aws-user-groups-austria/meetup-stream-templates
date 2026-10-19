/**
 * A coming AWS Community Day, everywhere one appears (the Upcoming scene,
 * the pre-show panel, the Break's second view and the header's CommunityDay
 * screens), one per screen: the eyebrow and its name across the top; under
 * them its website's screenshot (event.json `upcoming[].screenshot`) in a
 * browser-like card whose address bar shows the url, with the QR code to the
 * site on a white sticker over the card's corner; beside it the day, the
 * place and who from the community speaks there (round photos from
 * event.json, names under them). Without a screenshot, the QR code alone in
 * the card's place. On the meetup page's header the card, the name and the
 * url open the site, a speaker of tonight their dialog.
 *
 * `index` is which of upcomingFor(event) (soonest first); renders nothing
 * without that day.
 */
import React from "react";
import { Img } from "remotion";
import { resolveAsset } from "../assets";
import { Avatar } from "./Avatar";
import { Enter } from "./Enter";
import { Eyebrow } from "./Eyebrow";
import { Linked } from "./Linked";
import { Qr } from "./Qr";
import { STAGGER } from "../design/anim";
import { fitToken } from "../design/fit";
import { useEmber } from "../design/fonts";
import { boldWidth } from "../design/metrics";
import { speakerHref, speaksTonight, urlHref } from "../embed";
import { clampLines, COLORS, CONTENT_W, DAY, GROUP_GAP, PHOTO, QR, RADIUS, SPACE, TYPE, type } from "../theme";
import type { EventFile, Upcoming } from "../event.schema";
import { prettyUrl, upcomingFor } from "../model";
import { dayRange } from "../time";

const SHOT_H = Math.round((DAY.shotW * 9) / 16);
const MAX_SPEAKERS = 4;

/** The screenshot in a browser card: an address bar with the url, the picture, the QR sticker on the corner. */
const BrowserCard: React.FC<{ day: Upcoming; delay: number }> = ({ day, delay }) => (
  <Enter delay={delay} distance={32} style={{ position: "relative", flex: "0 0 auto", width: DAY.shotW }}>
    <Linked to={(embed) => urlHref(embed, day.url)} label={`${day.name}: website`} radius={RADIUS.lg}>
      <div
        data-browser={day.url}
        style={{
          width: DAY.shotW,
          borderRadius: RADIUS.lg,
          overflow: "hidden",
          backgroundColor: COLORS.surface3,
          border: `1px solid ${COLORS.border}`,
          boxShadow: `0 ${SPACE.lg}px ${SPACE.x3}px ${COLORS.shade}, 0 0 ${SPACE.x2}px ${COLORS.accentDim}`,
        }}
      >
        <div style={{ height: DAY.barH, boxSizing: "border-box", padding: `0 ${SPACE.md}px`, display: "flex", alignItems: "center", gap: SPACE.sm, backgroundColor: COLORS.surface, borderBottom: `1px solid ${COLORS.hairline}` }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: DAY.barDot, height: DAY.barDot, borderRadius: RADIUS.pill, backgroundColor: COLORS.hairline, border: `1px solid ${COLORS.border}` }} />
          ))}
          <div
            data-url=""
            style={{
              ...type("small", 500),
              lineHeight: 1.2,
              marginLeft: SPACE.sm,
              flex: 1,
              minWidth: 0,
              padding: `${SPACE.xs / 2}px ${SPACE.md}px`,
              borderRadius: RADIUS.pill,
              backgroundColor: COLORS.glassDeep,
              color: COLORS.secondary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {prettyUrl(day.url)}
          </div>
        </div>
        {day.screenshot ? (
          <Img data-screenshot={day.screenshot} src={resolveAsset(day.screenshot)} style={{ display: "block", width: DAY.shotW, height: SHOT_H, objectFit: "cover", objectPosition: "top center" }} />
        ) : (
          <div style={{ width: DAY.shotW, height: SHOT_H, display: "flex", alignItems: "center", justifyContent: "center", ...type("title"), color: COLORS.accent }}>{prettyUrl(day.url)}</div>
        )}
      </div>
    </Linked>
    {/* Above the card, also while the card is hovered (a hovered link is lifted over its siblings). */}
    <div style={{ position: "absolute", right: -DAY.qrOut, bottom: -DAY.qrOut, zIndex: 2 }}>
      <Linked to={(embed) => urlHref(embed, day.url)} label={`${day.name}: website`} radius={RADIUS.md}>
        <div data-qr={day.url} style={{ padding: QR.pad, backgroundColor: COLORS.qrLight, borderRadius: RADIUS.md, boxShadow: `0 ${SPACE.sm}px ${SPACE.xl}px ${COLORS.shade}` }}>
          <Qr value={day.url} size={DAY.qr} />
        </div>
      </Linked>
    </div>
  </Enter>
);

export const UpcomingBody: React.FC<{ event: EventFile; index?: number; width?: number; delay?: number }> = ({ event, index = 0, width = CONTENT_W, delay = 0 }) => {
  const day = upcomingFor(event)[index];
  const ember = useEmber();
  if (!day) return null;
  const infoW = width - DAY.shotW - DAY.colGap;
  const speakers = (day.speakers ?? []).slice(0, MAX_SPEAKERS);
  // Team-size photos; each name gets a column as wide as it needs, on one line, when the row fits.
  const photo = speakers.length > 3 ? "s" : "team";
  const cols = speakers.map((sp) => Math.ceil(Math.max(PHOTO[photo], boldWidth(sp.name, TYPE.small.size, ember))));
  const oneLine = cols.reduce((w, c) => w + c, 0) + SPACE.lg * Math.max(0, cols.length - 1) <= infoW;
  const cell = Math.floor((infoW - SPACE.lg * Math.max(0, speakers.length - 1)) / Math.max(1, speakers.length));
  const title = fitToken(day.name, width, 1, ["title", "heading"]);
  return (
    <div data-upcoming={day.name} style={{ display: "flex", flexDirection: "column", gap: SPACE.xl, width }}>
      <Linked to={(embed) => urlHref(embed, day.url)} label={`${day.name}: website`} radius={RADIUS.lg} style={{ alignSelf: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: SPACE.sm }}>
          <Enter delay={delay}>
            <Eyebrow>{index === 0 ? "Next AWS Community Day" : "Also coming up"}</Eyebrow>
          </Enter>
          <Enter delay={delay + STAGGER}>
            <div data-title={title} style={{ ...type(title), color: COLORS.text, whiteSpace: "nowrap" }}>
              {day.name}
            </div>
          </Enter>
        </div>
      </Linked>
      <div style={{ display: "flex", alignItems: "center", gap: DAY.colGap }}>
        <BrowserCard day={day} delay={delay + STAGGER * 2} />
        <Enter delay={delay + STAGGER * 3} style={{ width: infoW, display: "flex", flexDirection: "column", gap: GROUP_GAP }}>
          <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs }}>
            <div style={{ ...type("lead", 700), color: COLORS.accent }}>{dayRange(day.date, day.endDate)}</div>
            <div style={{ ...type("body"), color: COLORS.secondary, ...clampLines(2) }}>{day.location}</div>
          </div>
          {speakers.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: SPACE.md }}>
              <div style={{ ...type("label"), color: COLORS.muted }}>Speaking there</div>
              <div style={{ display: "flex", gap: SPACE.lg }}>
                {speakers.map((sp, i) => (
                  <Linked key={sp.name} to={speaksTonight(event, sp.name) ? (embed) => speakerHref(embed, event, sp.name) : null} label={`${sp.name} on the meetup page`} radius={RADIUS.lg} style={{ flex: "0 0 auto" }}>
                    <div
                      data-upcoming-speaker={sp.name}
                      style={{ width: oneLine ? cols[i] : cell, flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: SPACE.sm, textAlign: "center" }}
                    >
                      <Avatar name={sp.name} photo={sp.photo} size={photo} />
                      <div style={{ ...type("small", 700), ...(oneLine ? { whiteSpace: "nowrap" } : { maxWidth: cell, textWrap: "balance", ...clampLines(2) }) }}>{sp.name}</div>
                    </div>
                  </Linked>
                ))}
              </div>
            </div>
          ) : (
            <Linked to={(embed) => urlHref(embed, day.url)} label={`${day.name}: website`} radius={RADIUS.md} style={{ alignSelf: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: SPACE.xs }}>
                <div style={{ ...type("label"), color: COLORS.muted }}>Website</div>
                <div style={{ ...type("heading"), color: COLORS.accent }}>{prettyUrl(day.url)}</div>
              </div>
            </Linked>
          )}
        </Enter>
      </div>
    </div>
  );
};

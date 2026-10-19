/**
 * A speaker without a card: the round photo from event.json (initials only
 * without one) and beside it (or under it, `stacked`) the name and "Role at
 * Company". The photo size is the theme's for the number of speakers on
 * screen; the name steps down a token only when it would not fit.
 */
import React from "react";
import type { EventFile, Speaker as SpeakerT } from "../event.schema";
import { fitToken } from "../design/fit";
import { clampLines, COLORS, PHOTO, RADIUS, SPACE, type, type TypeName } from "../theme";
import { roleAt } from "../model";
import { speakerHref } from "../embed";
import { Avatar, type PhotoSize } from "./Avatar";
import { Linked } from "./Linked";

export const Speaker: React.FC<{
  event: EventFile;
  speaker: SpeakerT;
  photo: PhotoSize;
  width: number;
  stacked?: boolean;
  names?: TypeName[];
  role?: TypeName;
}> = ({ event, speaker, photo, width, stacked = false, names = ["heading", "lead"], role = "body" }) => {
  const gap = photo === "s" ? SPACE.md : SPACE.lg;
  const textW = stacked ? width : width - PHOTO[photo] - gap;
  const line = roleAt(event, speaker);
  return (
    <Linked to={(embed) => speakerHref(embed, event, speaker.name)} label={`${speaker.name} on the meetup page`} radius={RADIUS.lg}>
    <div
      data-speaker={speaker.name}
      style={{ width, display: "flex", flexDirection: stacked ? "column" : "row", alignItems: "center", textAlign: stacked ? "center" : "left", gap: stacked ? SPACE.md : gap }}
    >
      <Avatar name={speaker.name} photo={speaker.photo} size={photo} />
      <div style={{ width: textW, minWidth: 0, display: "flex", flexDirection: "column", gap: SPACE.xs }}>
        <div style={{ ...type(fitToken(speaker.name, textW, 2, names), 700), color: COLORS.text, textWrap: "balance", ...clampLines(2) }}>{speaker.name}</div>
        {line ? <div style={{ ...type(role), color: COLORS.secondary, textWrap: "balance", ...clampLines(2) }}>{line}</div> : null}
      </div>
    </div>
    </Linked>
  );
};

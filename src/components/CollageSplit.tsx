/**
 * The bookends of the evening (Welcome, AfterEnd), two columns: the text
 * block on the left, the hexagon photo collage of past meetups (event.json
 * community.photos[0]) on the right, both centred in the stage, apart by
 * SPLIT_GAP. Without a collage the text block alone, centred.
 */
import React from "react";
import { Img } from "remotion";
import { resolveAsset } from "../assets";
import { STAGGER } from "../design/anim";
import { COLLAGE_ASPECT, COLLAGE_W, CONTENT_W, SPLIT_GAP } from "../theme";
import { Enter } from "./Enter";

/** The text column beside the collage. */
export const COLLAGE_TEXT_W = CONTENT_W - COLLAGE_W - SPLIT_GAP;

export const CollageSplit: React.FC<{ collage?: string; children: (opts: { width: number; align: "left" | "center" }) => React.ReactNode }> = ({ collage, children }) =>
  collage ? (
    <div style={{ display: "flex", alignItems: "center", gap: SPLIT_GAP, width: CONTENT_W }}>
      <div style={{ width: COLLAGE_TEXT_W, flex: "0 0 auto" }}>{children({ width: COLLAGE_TEXT_W, align: "left" })}</div>
      <Enter delay={STAGGER * 2} distance={24} style={{ width: COLLAGE_W, flex: "0 0 auto" }}>
        <Img data-collage={collage} src={resolveAsset(collage)} style={{ display: "block", width: COLLAGE_W, height: Math.round(COLLAGE_W / COLLAGE_ASPECT) }} />
      </Enter>
    </div>
  ) : (
    <div style={{ display: "flex", justifyContent: "center", width: CONTENT_W }}>{children({ width: CONTENT_W, align: "center" })}</div>
  );

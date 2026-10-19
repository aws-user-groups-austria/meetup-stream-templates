/**
 * The whole agenda as one still for the slide deck: the agenda screen
 * (AgendaPage, the same as on the pre-show and the Welcome) with no row
 * highlighted. A one-frame Still, drawn settled; the bar has no chapter lit
 * and no "next".
 */
import React from "react";
import { AgendaPage } from "../components/AgendaList";
import { SceneFrame } from "../components/SceneFrame";
import type { SceneProps } from "../props";

export const Agenda: React.FC<SceneProps> = ({ event, segmentId }) => (
  <SceneFrame bar={{ event, showNext: false }}>
    <AgendaPage event={event} highlightId={segmentId} />
  </SceneFrame>
);

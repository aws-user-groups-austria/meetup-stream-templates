/**
 * Links for the host's laptop, never for the projector or a render: the
 * Meetup event, the meetup's page on awscommunity.at, the feedback form and
 * the next community day's site. A small group top right that shows on mouse
 * movement and hides after 3 s, and a row in the help overlay.
 */
import React, { useEffect, useState } from "react";
import type { EventFile } from "../../src/event.schema";
import { upcomingFor } from "../../src/model";
import { RADIUS } from "../../src/theme";
import { C, chrome } from "./chrome";

export type PlayerLink = { label: string; url: string };

export const linksFor = (event: EventFile): PlayerLink[] => {
  const links: PlayerLink[] = [
    { label: "Meetup event", url: event.links.meetup },
    { label: "Meetup page", url: `https://awscommunity.at/meetups/${event.id}/` },
  ];
  links.push({ label: "Feedback", url: event.links.feedback });
  const next = upcomingFor(event)[0];
  if (next) links.push({ label: next.name, url: next.url });
  return links;
};

const HIDE_MS = 3000;

/** A link that opens in a new tab and does not count as a click on the stage (which would advance). */
export const LinkPill: React.FC<{ link: PlayerLink }> = ({ link }) => (
  <a
    href={link.url}
    target="_blank"
    rel="noopener noreferrer"
    data-link={link.label}
    onClick={(e) => e.stopPropagation()}
    style={{
      ...chrome("label"),
      textTransform: "none",
      letterSpacing: 0,
      color: C.text,
      textDecoration: "none",
      padding: "0.35em 0.8em",
      borderRadius: RADIUS.pill,
      background: C.glass,
      border: `1px solid ${C.border}`,
      whiteSpace: "nowrap",
    }}
  >
    {link.label}
  </a>
);

export const PlayerLinks: React.FC<{ event: EventFile }> = ({ event }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer = 0;
    const onMove = () => {
      setVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(false), HIDE_MS);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);
  if (!visible) return null;
  return (
    <nav
      data-links=""
      onClick={(e) => e.stopPropagation()}
      style={{ position: "fixed", top: "1em", right: "1em", zIndex: 40, display: "flex", gap: "0.5em", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: "70vw" }}
    >
      {linksFor(event).map((l) => (
        <LinkPill key={l.label} link={l} />
      ))}
    </nav>
  );
};

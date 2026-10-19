/**
 * Something on screen that is a link on the meetup page's header, and only
 * there: without the player's embed context (Studio, renders, the room
 * screen) it renders its children as they are, no wrapper, no change.
 *
 * In the header it is an <a>: a page of the website in the top window
 * (target="_top": the iframe is on the same site, and a hash on the page
 * opens that dialog there), any other site in a new tab. A click never also
 * counts as a click on the stage. On hover: the pointer, an accent ring a
 * little outside the element with a soft tint, a small lift (LINK).
 */
import React, { useState } from "react";
import { useEmbed, type Embed, type Href } from "../embed";
import { COLORS, LINK, RADIUS } from "../theme";

export const Linked: React.FC<{
  /** The link, from the embed context; null or undefined leaves the children as they are. */
  to: ((embed: Embed) => Href | null | undefined) | null | undefined;
  /** What it opens, for the tooltip and screen readers. */
  label: string;
  /** The ring's corners: round for a photo. */
  round?: boolean;
  radius?: number;
  /** The gap between the element and its ring: LINK.offset, or LINK.offsetTight in a list. */
  offset?: number;
  /** Layout of the <a> itself (block by default). */
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ to, label, round = false, radius = RADIUS.md, offset = LINK.offset, style, children }) => {
  const embed = useEmbed();
  const [hover, setHover] = useState(false);
  const link = embed && to ? to(embed) : null;
  if (!link) return <>{children}</>;
  return (
    <a
      href={link.href}
      target={link.target === "top" ? "_top" : "_blank"}
      rel={link.target === "blank" ? "noopener noreferrer" : undefined}
      title={label}
      aria-label={label}
      data-link={link.href}
      onClick={(e) => e.stopPropagation()}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        display: "block",
        color: "inherit",
        textDecoration: "none",
        cursor: "pointer",
        borderRadius: round ? "50%" : radius,
        outline: "none",
        transition: `box-shadow ${LINK.ease}ms ease-out, transform ${LINK.ease}ms ease-out, background-color ${LINK.ease}ms ease-out`,
        transform: hover && offset > 0 ? `translateY(${-LINK.lift}px)` : "none",
        position: "relative",
        zIndex: hover ? 1 : "auto",
        backgroundColor: hover ? COLORS.accentDim : "transparent",
        boxShadow: hover
          ? `0 0 0 ${offset}px ${COLORS.accentDim}, 0 0 0 ${offset + LINK.ring}px ${COLORS.accent}, 0 0 ${LINK.glow}px ${offset}px ${COLORS.accentGlow}`
          : "none",
        ...style,
      }}
    >
      {children}
    </a>
  );
};

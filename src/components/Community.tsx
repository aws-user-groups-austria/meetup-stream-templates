/**
 * The group's own pages from its deck, as pieces the intro scenes and the
 * PreShow panels share: the team, the groups, the member badges, the code of
 * conduct. Each renders nothing without its data in event.json `community`.
 */
import React from "react";
import { Img } from "remotion";
import { resolveAsset } from "../assets";
import type { Community, EventFile } from "../event.schema";
import { STAGGER } from "../design/anim";
import { useEmber } from "../design/fonts";
import { boldWidth } from "../design/metrics";
import { BADGE, clampLines, COLORS, CONTENT_W, GROUP_GAP, GROUPS, LOGO, QR, RADIUS, SPACE, SPLIT_GAP, TEAM, TYPE, type } from "../theme";
import { Avatar } from "./Avatar";
import { Enter } from "./Enter";
import { PageHead } from "./PageHead";
import { QrCard } from "./QrCard";
import { Qr } from "./Qr";
import { Linked } from "./Linked";
import { urlHref } from "../embed";

export { PageHead } from "./PageHead";

/** The overline of the team page. */
export const TEAM_OVERLINE = "Leader team";

/** A role written "AWS Hero · AWS Community DACH" is set as two lines, one per part; any other role wraps. */
export const roleLines = (role: string): string[] => {
  const parts = role.split(/\s+\u00b7\s+/);
  return parts.length === 2 ? parts : [role];
};

/**
 * Who we are, two columns: the page head on the left, the team on the right
 * in a 3 x 2 grid of centred cards (the round photo, the name, the role in
 * at most two lines of Small). The names share one token: Body when every
 * name fits its card on one line, else Small.
 */
export const TeamPage: React.FC<{ community?: Community; fallbackName: string }> = ({ community, fallbackName }) => {
  const team = (community?.team ?? []).slice(0, 6);
  const ember = useEmber();
  if (team.length === 0) return <PageHead overline={TEAM_OVERLINE} title="Who we are" subtitle={community?.name ?? fallbackName} />;
  const perRow = 3;
  const gridW = CONTENT_W - TEAM.headW - TEAM.gap;
  const cell = Math.floor((gridW - TEAM.colGap * (perRow - 1)) / perRow);
  const nameToken = team.every((p) => boldWidth(p.name, TYPE.body.size, ember) <= cell) ? "body" : "small";
  return (
    <div data-team="" style={{ display: "flex", alignItems: "center", gap: TEAM.gap, width: CONTENT_W }}>
      <div style={{ width: TEAM.headW, flex: "0 0 auto" }}>
        <PageHead overline={TEAM_OVERLINE} title="Who we are" subtitle={community?.name ?? fallbackName} width={TEAM.headW} />
      </div>
      <div style={{ width: gridW, display: "grid", gridTemplateColumns: `repeat(${perRow}, ${cell}px)`, columnGap: TEAM.colGap, rowGap: TEAM.rowGap }}>
        {team.map((p, i) => (
          <Enter key={p.name} delay={STAGGER * (2 + i)} distance={24}>
            <Linked to={(embed) => ({ href: `${embed.site}/team/`, target: "top" })} label={`${p.name}: our team`} radius={RADIUS.lg}>
            <div data-person={p.name} style={{ width: cell, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <Avatar name={p.name} photo={p.photo} size="team" />
              <div style={{ ...type(nameToken, 700), color: COLORS.text, marginTop: SPACE.md, maxWidth: cell, textWrap: "balance", ...clampLines(2) }}>{p.name}</div>
              {p.role ? (
                <div data-role="" style={{ ...type("small", 400), color: COLORS.secondary, marginTop: SPACE.xs, maxWidth: cell, textWrap: "balance", ...clampLines(2) }}>
                  {roleLines(p.role).map((l, j) => (j === 0 ? l : [<br key={j} />, l]))}
                </div>
              ) : null}
            </div>
            </Linked>
          </Enter>
        ))}
      </div>
    </div>
  );
};

/**
 * What we do: each group's logo (made for a dark background) and, when the
 * group has a Meetup page and the row has room (up to three groups), the QR
 * code to it beside the logo, the two on a glass card of their own so it is
 * clear which code is whose. Without room, the logos alone, spread evenly. On the meetup
 * page's header the logo and the QR open the group's page.
 */
export const GroupsRow: React.FC<{ groups: Community["groups"] }> = ({ groups }) => {
  const shown = groups.slice(0, 4);
  const cell = Math.floor(CONTENT_W / Math.max(1, shown.length));
  const withQr = shown.length <= 3 && shown.every((g) => g.url);
  const logoH = withQr ? GROUPS.logo : LOGO.group;
  const qrBox = GROUPS.qr + QR.pad * 2;
  const cardW = Math.floor((CONTENT_W - GROUPS.cardGap * (shown.length - 1)) / Math.max(1, shown.length));
  const logoW = withQr ? cardW - GROUPS.pad * 2 - GROUPS.gap - qrBox : cell;
  return (
    <div data-groups="" style={{ display: "flex", justifyContent: withQr ? "center" : "space-evenly", gap: withQr ? GROUPS.cardGap : 0, width: CONTENT_W, alignItems: "center" }}>
      {shown.map((g, i) => (
        <Enter key={g.name} delay={STAGGER * (2 + i)} distance={24}>
          <Linked to={g.url ? (embed) => urlHref(embed, g.url!) : null} label={`${g.name} on Meetup`} radius={RADIUS.xl}>
            <div
              data-group={g.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: GROUPS.gap,
                ...(withQr
                  ? { width: cardW, boxSizing: "border-box", padding: GROUPS.pad, borderRadius: RADIUS.xl, backgroundColor: COLORS.glass, border: `1px solid ${COLORS.border}` }
                  : {}),
              }}
            >
              {g.logo ? (
                <Img data-group-logo={g.logo} src={resolveAsset(g.logo)} style={{ display: "block", height: logoH, maxWidth: logoW, objectFit: "contain" }} />
              ) : (
                <div style={{ ...type("heading"), textAlign: "center", maxWidth: logoW }}>{g.name}</div>
              )}
              {withQr ? (
                <div data-qr={g.url} style={{ padding: QR.pad, backgroundColor: COLORS.qrLight, borderRadius: RADIUS.md, boxShadow: `0 0 ${SPACE.x2}px ${COLORS.accentGlow}`, flex: "0 0 auto" }}>
                  <Qr value={g.url!} size={GROUPS.qr} />
                </div>
              ) : null}
            </div>
          </Linked>
        </Enter>
      ))}
    </div>
  );
};

/** Introducing our members: the badges, each with its title and line, centred in equal cells. */
export const BadgesRow: React.FC<{ badges: Community["badges"] }> = ({ badges }) => {
  const shown = badges.slice(0, 6);
  const n = Math.max(1, shown.length);
  const cell = Math.floor((CONTENT_W - SPACE.xl * (n - 1)) / n);
  return (
    <div data-badges="" style={{ display: "flex", gap: SPACE.xl, alignItems: "flex-start", justifyContent: "center", width: CONTENT_W }}>
      {shown.map((b, i) => (
        <Enter key={b.name} delay={STAGGER * (2 + i)} distance={24}>
          <div data-badge={b.name} style={{ width: cell, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <Img src={resolveAsset(b.image)} style={{ display: "block", width: BADGE, height: BADGE, objectFit: "contain" }} />
            <div style={{ ...type("small", 700), color: COLORS.text, marginTop: SPACE.md, textWrap: "balance" }}>{b.title}</div>
            {b.text ? <div style={{ ...type("small", 400), color: COLORS.secondary, marginTop: SPACE.xs, textWrap: "balance", ...clampLines(4) }}>{b.text}</div> : null}
          </div>
        </Enter>
      ))}
    </div>
  );
};

/** The QR column of a two-column screen: the code and its caption. */
export const qrColumn = (size: keyof typeof QR & ("l" | "m" | "s")): number => QR[size] + QR.pad * 2 + SPACE.x2;

/** Growing together, two columns: the page head and the code of conduct's lines on the left, the QR to it on the right. */
export const CodeOfConduct: React.FC<{ coc: NonNullable<Community["codeOfConduct"]>; width: number }> = ({ coc, width }) => {
  const side = coc.url ? qrColumn("m") : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SPLIT_GAP, width }}>
      <div style={{ display: "flex", flexDirection: "column", gap: GROUP_GAP, minWidth: 0, flex: 1 }}>
        <PageHead overline="Code of Conduct" title={coc.title} subtitle={coc.subtitle} />
        <Enter delay={STAGGER * 3} style={{ display: "flex", flexDirection: "column", gap: SPACE.lg }}>
          {coc.lines.slice(0, 4).map((l) => (
            <div key={l} style={{ ...type("body"), color: COLORS.secondary, paddingLeft: SPACE.lg, borderLeft: `${SPACE.xs - 2}px solid ${COLORS.accent}`, textWrap: "pretty" }}>
              {l}
            </div>
          ))}
        </Enter>
      </div>
      {coc.url ? (
        <Enter delay={STAGGER * 3} style={{ width: side, flex: "0 0 auto", display: "flex", justifyContent: "center" }}>
          <QrCard url={coc.url} size="m" caption="Code of Conduct" showUrl={false} />
        </Enter>
      ) : null}
    </div>
  );
};

/** A screen of its own with a page head over one centred row (What we do, Introducing our members). */
export const CentredPage: React.FC<{ overline: string; title: string; subtitle?: string; children?: React.ReactNode }> = ({ overline, title, subtitle, children }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: GROUP_GAP + SPACE.sm, width: CONTENT_W }}>
    <PageHead overline={overline} title={title} subtitle={subtitle} align="center" width={CONTENT_W} />
    {children}
  </div>
);

export const communityOf = (event: EventFile): Community | undefined => event.community;

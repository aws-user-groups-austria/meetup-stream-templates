/**
 * While doors are open: panels of equal length, looping seamlessly, one
 * message each.
 *   1. the date, event title, host and venue, "Talks start at 18:00" with a countdown
 *   2. tonight's agenda
 *   3. who we are, the team (from event.json `community`)
 *   4. thanks to the sponsor (only with a sponsor)
 *   5. introducing our members, the badges (from `community`)
 *   6. the next AWS Community Day (only when event.json has one)
 *   7. good to know: photos, the Code of Conduct, the event page QR
 * What is next is in the bottom bar throughout.
 */
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { AgendaPage } from "../components/AgendaList";
import { BadgesRow, CentredPage, qrColumn, TeamPage } from "../components/Community";
import { Countdown } from "../components/Countdown";
import { Enter } from "../components/Enter";
import { PageHead } from "../components/PageHead";
import { QrCard } from "../components/QrCard";
import { SceneFrame } from "../components/SceneFrame";
import { SponsorThanks } from "../components/SponsorThanks";
import { UpcomingBody } from "../components/UpcomingBody";
import { useIsBefore } from "../clock";
import { Linked } from "../components/Linked";
import { urlHref, useEmbed } from "../embed";
import { exitOpacity, STAGGER } from "../design/anim";
import { clampLines, COLORS, CONTENT_MAX, CONTENT_W, GROUP_GAP, PRESHOW_FRAMES, RADIUS, SPACE, SPLIT_GAP, type } from "../theme";
import type { EventFile } from "../event.schema";
import { excerpt, findSegment, programmeStart, shortAddress, shortTitle, titleSuffix, upcomingFor } from "../model";
import type { SceneProps } from "../props";
import { localDate, localTime, msBetween } from "../time";

type PanelId = "title" | "agenda" | "team" | "sponsor" | "members" | "upcoming" | "notice";

/** The panels for this event; each optional one only when event.json has its data. */
export const preShowPanels = (event: EventFile): PanelId[] =>
  (["title", "agenda", "team", "sponsor", "members", "upcoming", "notice"] as const).filter(
    (p) =>
      (p !== "sponsor" || event.sponsors.length > 0) &&
      (p !== "upcoming" || upcomingFor(event).length > 0) &&
      (p !== "team" || (event.community?.team.length ?? 0) > 0) &&
      (p !== "members" || (event.community?.badges.length ?? 0) > 0),
  );

/** Frames per panel: the loop is split evenly, so it always lasts PRESHOW_FRAMES. */
export const preShowPanelFrames = (event: EventFile): number => Math.floor(PRESHOW_FRAMES / preShowPanels(event).length);

/** The photo notice in one short sentence; another notice by its first sentence. */
export const PHOTO_NOTICE = "Photos and videos are taken tonight; tell an organizer if you prefer not to appear.";
export const noticeLine = (notice: string): string => (/photo|video|record/i.test(notice) ? PHOTO_NOTICE : excerpt(notice, 1).text);

/** Where the countdown points: doors before they open, the programme after. */
const useTarget = (event: EventFile, segmentId?: string) => {
  const doors = findSegment(event, segmentId, "networking");
  const start = programmeStart(event);
  const beforeDoors = useIsBefore(event.doorsOpen);
  if (beforeDoors) return { label: `Doors open at ${localTime(event.doorsOpen)}`, iso: event.doorsOpen, fallback: 0 };
  const iso = start?.start ?? doors?.end ?? event.doorsOpen;
  // Static value: the whole wait from doors to the first item.
  return { label: `Talks start at ${localTime(iso)}`, iso, fallback: Math.max(0, msBetween(doors?.start ?? event.doorsOpen, iso)) };
};

/** Frames per panel; null: one panel held for as long as it is up (the meetup page's header). */
const PanelLength = React.createContext<number | null>(PRESHOW_FRAMES);

const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const frame = useCurrentFrame();
  const length = React.useContext(PanelLength);
  return (
    <AbsoluteFill style={{ opacity: length === null ? 1 : exitOpacity(frame, length, 20), display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", ...style }}>
      {children}
    </AbsoluteFill>
  );
};

/** The title panel, centred: the date, the event, "hosted by", the venue, and the countdown to the programme on one glass band. */
const TitlePanel: React.FC<SceneProps> = ({ event, segmentId }) => {
  const target = useTarget(event, segmentId);
  const title = shortTitle(event);
  const suffix = titleSuffix(event);
  return (
    <Panel>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: GROUP_GAP, width: CONTENT_W }}>
        <Linked to={(embed) => urlHref(embed, event.links.meetup)} label={`${title} on Meetup: RSVP`} radius={RADIUS.xl}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <PageHead overline={localDate(event.doorsOpen)} title={title} sizes={["display", "title", "heading"]} lines={2} align="center" width={CONTENT_W} />
          {suffix ? (
            <Enter delay={STAGGER * 2}>
              <div style={{ ...type("heading"), color: COLORS.accent, marginTop: SPACE.sm }}>{suffix}</div>
            </Enter>
          ) : null}
          <Enter delay={STAGGER * 3}>
            <div style={{ ...type("body"), color: COLORS.secondary, marginTop: SPACE.lg, maxWidth: CONTENT_MAX, ...clampLines(1) }}>
              <span style={{ color: COLORS.text, fontWeight: 700 }}>{event.venue.name}</span>, {shortAddress(event.venue.address)}
            </div>
          </Enter>
        </div>
        </Linked>
        <Enter delay={STAGGER * 5}>
          <div
            data-preshow-countdown=""
            style={{
              display: "flex",
              alignItems: "center",
              gap: SPACE.x3,
              padding: `${SPACE.lg}px ${SPACE.x2}px`,
              borderRadius: RADIUS.xl,
              background: `linear-gradient(100deg, ${COLORS.surface2} 0%, ${COLORS.glass} 100%)`,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ ...type("heading") }}>{target.label}</div>
            <div style={{ width: 1, alignSelf: "stretch", backgroundColor: COLORS.border }} />
            <Countdown targetIso={target.iso} fallbackMs={target.fallback} color={COLORS.accent} size="heading" />
          </div>
        </Enter>
      </div>
    </Panel>
  );
};

const AgendaPanel: React.FC<SceneProps> = ({ event, segmentId }) => (
  <Panel>
    <AgendaPage event={event} highlightId={findSegment(event, segmentId, "networking")?.id} />
  </Panel>
);

const SponsorPanel: React.FC<SceneProps> = ({ event }) => (
  <Panel>
    <SponsorThanks sponsors={event.sponsors} overline={event.sponsors.length > 1 ? "Our sponsors" : "Our sponsor"} subtitle="for supporting tonight's meetup" />
  </Panel>
);

const UpcomingPanel: React.FC<SceneProps> = ({ event }) => (
  <Panel>
    <UpcomingBody event={event} width={CONTENT_W} />
  </Panel>
);

/** Good to know, two columns: the photo notice and the code of conduct line on the left, the event page's QR on the right. */
const NoticePanel: React.FC<SceneProps> = ({ event }) => {
  const notice = event.notices[0];
  const side = qrColumn("m");
  return (
    <Panel>
      <div style={{ display: "flex", alignItems: "center", gap: SPLIT_GAP, width: CONTENT_W }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: GROUP_GAP }}>
          <PageHead overline="Tonight" title="Good to know" />
          <Enter delay={STAGGER * 2} style={{ display: "flex", flexDirection: "column", gap: SPACE.lg, maxWidth: CONTENT_MAX - side }}>
            {notice ? <div style={{ ...type("body"), color: COLORS.secondary, paddingLeft: SPACE.lg, borderLeft: `${SPACE.xs - 2}px solid ${COLORS.accent}` }}>{noticeLine(notice)}</div> : null}
            <div style={{ ...type("body"), color: COLORS.secondary, paddingLeft: SPACE.lg, borderLeft: `${SPACE.xs - 2}px solid ${COLORS.accent}` }}>
              <span style={{ color: COLORS.text, fontWeight: 700 }}>Be kind and respectful.</span> Our Code of Conduct applies to everyone tonight.
            </div>
          </Enter>
        </div>
        <Enter delay={STAGGER * 3} style={{ width: side, flex: "0 0 auto", display: "flex", justifyContent: "center" }}>
          <QrCard url={event.links.meetup} size="m" caption="Event page on Meetup" showUrl={false} />
        </Enter>
      </div>
    </Panel>
  );
};

const TeamPanel: React.FC<SceneProps> = ({ event }) => (
  <Panel>
    <TeamPage community={event.community} fallbackName={event.group.name} />
  </Panel>
);

const MembersPanel: React.FC<SceneProps> = ({ event }) => (
  <Panel>
    <CentredPage overline="Look for the badges" title="Introducing our members">
      <BadgesRow badges={event.community?.badges ?? []} />
    </CentredPage>
  </Panel>
);

const PANELS: Record<PanelId, React.FC<SceneProps>> = {
  title: TitlePanel,
  agenda: AgendaPanel,
  team: TeamPanel,
  sponsor: SponsorPanel,
  members: MembersPanel,
  upcoming: UpcomingPanel,
  notice: NoticePanel,
};

export const PreShow: React.FC<SceneProps> = (props) => {
  const embed = useEmbed();
  const panels = preShowPanels(props.event);
  const length = preShowPanelFrames(props.event);
  const doors = findSegment(props.event, props.segmentId, "networking");
  // The meetup page's header holds the event card: its tour shows the other screens on their own.
  if (embed) {
    return (
      <SceneFrame bar={{ event: props.event, currentId: doors?.id }}>
        <PanelLength.Provider value={null}>
          <div style={{ position: "relative", flex: 1 }}>
            <TitlePanel {...props} />
          </div>
        </PanelLength.Provider>
      </SceneFrame>
    );
  }
  return (
    <SceneFrame bar={{ event: props.event, currentId: doors?.id }}>
      <PanelLength.Provider value={length}>
        <div style={{ position: "relative", flex: 1 }}>
          {panels.map((id, i) => {
            const P = PANELS[id];
            return (
              <Sequence key={id} from={i * length} durationInFrames={length} layout="none">
                <AbsoluteFill>
                  <P {...props} />
                </AbsoluteFill>
              </Sequence>
            );
          })}
        </div>
      </PanelLength.Provider>
    </SceneFrame>
  );
};


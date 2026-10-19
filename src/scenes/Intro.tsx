/**
 * The welcome's intro pages, after the group's deck: Who we are, What we do,
 * Introducing our members, Growing together. Each is one message on the
 * stream's theme, with the bottom bar on the welcome part. Without its data
 * in event.json `community` a page shows only its head (and the run of
 * show skips it).
 */
import React from "react";
import { BadgesRow, CentredPage, CodeOfConduct, GroupsRow, PageHead, TeamPage } from "../components/Community";
import { SceneFrame } from "../components/SceneFrame";
import { CONTENT_W } from "../theme";
import { findSegment } from "../model";
import type { SceneProps } from "../props";

const Page: React.FC<SceneProps & { children: React.ReactNode }> = ({ event, segmentId, children }) => {
  const segment = findSegment(event, segmentId, "welcome");
  return <SceneFrame bar={{ event, currentId: segment?.id }}>{children}</SceneFrame>;
};

export const WhoWeAre: React.FC<SceneProps> = (props) => (
  <Page {...props}>
    <TeamPage community={props.event.community} fallbackName={props.event.group.name} />
  </Page>
);

export const WhatWeDo: React.FC<SceneProps> = (props) => {
  const groups = props.event.community?.groups ?? [];
  return (
    <Page {...props}>
      <CentredPage overline={props.event.community?.name ?? props.event.group.name} title="What we do" subtitle="Our user groups in Austria">
        {groups.length > 0 ? <GroupsRow groups={groups} /> : null}
      </CentredPage>
    </Page>
  );
};

export const Members: React.FC<SceneProps> = (props) => {
  const badges = props.event.community?.badges ?? [];
  return (
    <Page {...props}>
      <CentredPage overline="Look for the badges" title="Introducing our members">
        {badges.length > 0 ? <BadgesRow badges={badges} /> : null}
      </CentredPage>
    </Page>
  );
};

export const GrowingTogether: React.FC<SceneProps> = (props) => {
  const coc = props.event.community?.codeOfConduct;
  return (
    <Page {...props}>{coc ? <CodeOfConduct coc={coc} width={CONTENT_W} /> : <PageHead overline="Code of Conduct" title="Growing together" />}</Page>
  );
};

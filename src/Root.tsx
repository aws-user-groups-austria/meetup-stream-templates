/**
 * What Studio shows: one composition per scene, each taking
 * { event, segmentId? } and opening on the real 20 October evening from
 * examples/event.sample.json.
 */
import React from "react";
import { Composition, Folder, Still } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./theme";
import { ArchiveProvider } from "./archive";
import { archiveSceneSchema, sceneSchema, type ArchiveSceneProps, type SceneProps } from "./props";
import { sampleArchive, sampleEvent } from "./sample";
import { SCENE_IDS, SCENE_KIND, SCENES } from "./scenes";

const defaultsFor = (id: (typeof SCENE_IDS)[number]): SceneProps => {
  const kind = SCENE_KIND[id];
  const segment = kind ? sampleEvent.segments.find((s) => s.kind === kind) : undefined;
  return segment ? { event: sampleEvent, segmentId: segment.id } : { event: sampleEvent };
};

/** A scene that reads the archive, given it as the `archive` prop (the player provides it on the context instead). */
const withArchive = (Scene: React.FC<SceneProps>): React.FC<ArchiveSceneProps> => {
  const Wrapped: React.FC<ArchiveSceneProps> = ({ archive, ...props }) => (
    <ArchiveProvider value={archive ?? null}>
      <Scene {...props} />
    </ArchiveProvider>
  );
  return Wrapped;
};

const ARCHIVE_SCENES = Object.fromEntries(SCENE_IDS.filter((id) => SCENES[id].archive).map((id) => [id, withArchive(SCENES[id].component)]));

export const RemotionRoot: React.FC = () => (
  <Folder name="Evening">
    {SCENE_IDS.map((id) => {
      const scene = SCENES[id];
      return scene.still ? (
        <Still
          key={id}
          id={id}
          component={scene.component}
          schema={sceneSchema}
          defaultProps={defaultsFor(id)}
          width={WIDTH}
          height={HEIGHT}
        />
      ) : scene.archive ? (
        <Composition
          key={id}
          id={id}
          component={ARCHIVE_SCENES[id]!}
          schema={archiveSceneSchema}
          defaultProps={{ ...defaultsFor(id), archive: sampleArchive }}
          durationInFrames={scene.durationInFrames}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ) : (
        <Composition
          key={id}
          id={id}
          component={scene.component}
          schema={sceneSchema}
          defaultProps={defaultsFor(id)}
          durationInFrames={scene.durationInFrames}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      );
    })}
  </Folder>
);

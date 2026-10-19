/**
 * What every scene takes: the whole event, and optionally which segment it is
 * about (without `segmentId` a scene picks the first segment of its kind) and
 * which item of a list (`index`, CommunityDay).
 */
import { z } from "zod";
import { archiveSchema } from "./archive";
import { eventSchema } from "./event.schema";

export const sceneSchema = z.object({
  event: eventSchema,
  segmentId: z.string().optional(),
  /** Which one of a list the scene is about: CommunityDay shows the index-th coming community day (0, the soonest, by default). */
  index: z.number().int().nonnegative().optional(),
});

export type SceneProps = z.infer<typeof sceneSchema>;

/** The scenes that read the meetup archive take it as a prop in Studio and the stills (the player puts it on ArchiveContext). */
export const archiveSceneSchema = sceneSchema.extend({ archive: archiveSchema.optional() });
export type ArchiveSceneProps = z.infer<typeof archiveSceneSchema>;

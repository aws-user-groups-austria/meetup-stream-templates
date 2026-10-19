/**
 * examples/event.sample.json, validated. Studio's default props, so every
 * scene opens on the real 20 October evening.
 */
import raw from "../examples/event.sample.json";
import archiveRaw from "../examples/archive.sample.json";
import { archiveSchema, type Archive } from "./archive";
import { eventSchema, type EventFile } from "./event.schema";

export const sampleEvent: EventFile = eventSchema.parse(raw);

/** examples/archive.sample.json (a copy of what scripts/archive-index.mjs writes), for "Our meetups" and "Our hosts and sponsors" in Studio. */
export const sampleArchive: Archive = archiveSchema.parse(archiveRaw);

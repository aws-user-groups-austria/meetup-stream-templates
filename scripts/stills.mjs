/**
 * Render one PNG per composition, bundling once.
 *
 *   node scripts/stills.mjs [--event path/to/event.json] [--frame 90]
 *                           [--scale 1] [--out dir] [--only Break,Closing]
 *                           [--shared dir]
 *
 * Without --event it renders the hand-written examples/event.sample.json into
 * out/stills-sample/; with --event, into out/stills/ unless --out says
 * otherwise. `make stills` passes the synced event from ../meetup-event-vienna.
 *
 * Event image paths like "events/<id>/assets/darko.jpg" are resolved the way
 * the web player resolves them: when the event file sits next to an assets/
 * folder (meetup-event-vienna/events/<id>/), that folder is served as
 * events/<id>/assets/ beside ../public for this render. Paths starting with
 * people/, logos/, badges/ or community/ come from the events repository's
 * shared folders (two up from the event file, meetup-event-vienna/, or
 * --shared <dir>), served under the same names.
 *
 * Talk scenes (SpeakerHandover, NowSpeaking) get one still per talk segment,
 * Break one per break (and one of its upcoming view), PreShow one per panel,
 * Welcome one of the welcome and one of its agenda view, Upcoming one when
 * the event has an upcoming community day, CommunityDay one per coming
 * community day, OurMeetups and OurSponsors one each with the meetup archive
 * (--archive, else web-player/public/events/archive.json, else
 * examples/archive.sample.json). Everything else one still at
 * --frame (90 by default: past the entrances, so the layout is settled).
 * No live clock is provided, so countdowns show their static value.
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const eventArg = arg("event", null);
const eventPath = path.resolve(root, eventArg ?? "examples/event.sample.json");
const outDir = path.resolve(root, arg("out", eventArg ? "out/stills" : "out/stills-sample"));
const frame = Number(arg("frame", "90"));
const scale = Number(arg("scale", "1"));
const only = arg("only", "").split(",").map((s) => s.trim()).filter(Boolean);

const event = JSON.parse(await fs.readFile(eventPath, "utf8"));
// The meetup archive for "Our meetups" and "Our hosts and sponsors": --archive, else the player's
// (written by make player-event), else the sample. Those two scenes are skipped without any.
const archivePath = [arg("archive", null), "web-player/public/events/archive.json", "examples/archive.sample.json"]
  .filter(Boolean)
  .map((p) => path.resolve(root, p))
  .find((p) => fsSync.existsSync(p));
const archive = archivePath ? JSON.parse(await fs.readFile(archivePath, "utf8")) : null;
const segmentsOf = (kind) => event.segments.filter((s) => s.kind === kind).map((s) => s.id);

const PER_SEGMENT = {
  SpeakerHandover: "talk",
  NowSpeaking: "talk",
  Break: "break",
};
const IDS = ["PreShow", "Welcome", "WhoWeAre", "WhatWeDo", "Members", "GrowingTogether", "SponsorHandover", "SpeakerHandover", "NowSpeaking", "Break", "Closing", "AfterEnd", "Agenda", "Upcoming", "CommunityDay", "OurMeetups", "OurSponsors"];
/** The scenes that read the meetup archive (SCENES[id].archive in src/scenes.ts): given it as the `archive` prop. */
const ARCHIVE_SCENES = new Set(["OurMeetups", "OurSponsors"]);

// Must match src/theme.ts (LOOP_FRAMES, PRESHOW_FRAMES), preShowPanels() in
// src/scenes/PreShow.tsx, introScenes() in src/sceneFor.ts and upcomingFor()
// in src/model.ts.
const INTRO_FRAMES = 60;
const LOOP_FRAMES = 1800;
const eventDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit" }).format(
  new Date(event.doorsOpen),
);
const upcomingDays = (event.upcoming ?? []).filter((u) => (u.endDate ?? u.date) >= eventDay).sort((a, b) => a.date.localeCompare(b.date));
const hasUpcoming = upcomingDays.length > 0;
const community = event.community;
const preShowPanels =
  3 + (event.sponsors.length > 0 ? 1 : 0) + (hasUpcoming ? 1 : 0) + ((community?.team?.length ?? 0) > 0 ? 1 : 0) + ((community?.badges?.length ?? 0) > 0 ? 1 : 0);
const PRESHOW_FRAMES = LOOP_FRAMES * 2;
const panelFrames = Math.floor(PRESHOW_FRAMES / preShowPanels);
/** Which intro pages this event has (introScenes() in src/sceneFor.ts). */
const intro = {
  WhoWeAre: (community?.team?.length ?? 0) > 0,
  WhatWeDo: (community?.groups?.length ?? 0) > 0,
  Members: (community?.badges?.length ?? 0) > 0,
  GrowingTogether: Boolean(community?.codeOfConduct),
};
/** A frame well inside the second view of a two-view hold (Welcome, Break). */
const secondView = INTRO_FRAMES + LOOP_FRAMES / 2 + frame;

/** [{ id, name, segmentId?, frame }] */
const jobs = [];
for (const id of IDS) {
  if (only.length && !only.includes(id)) continue;
  if (PER_SEGMENT[id]) {
    for (const segmentId of segmentsOf(PER_SEGMENT[id])) {
      jobs.push({ id, name: `${id}--${segmentId}`, segmentId, frame });
      if (id === "Break" && hasUpcoming) jobs.push({ id, name: `${id}--${segmentId}--upcoming`, segmentId, frame: secondView });
    }
  } else if (id === "Welcome") {
    jobs.push({ id, name: id, frame });
    jobs.push({ id, name: `${id}--agenda`, frame: secondView });
  } else if (id in intro) {
    if (intro[id]) jobs.push({ id, name: id, frame });
  } else if (id === "Upcoming") {
    if (hasUpcoming) jobs.push({ id, name: id, frame });
  } else if (id === "CommunityDay") {
    // One per coming community day (upcomingFor() in src/model.ts: on or after the evening, soonest first).
    upcomingDays.forEach((u, index) => jobs.push({ id, name: `${id}--${index + 1}-${u.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, index, frame }));
  } else if (ARCHIVE_SCENES.has(id)) {
    if (archive) jobs.push({ id, name: id, frame });
  } else if (id === "PreShow") {
    for (let p = 0; p < preShowPanels; p++) jobs.push({ id, name: `${id}--panel-${p + 1}`, frame: p * panelFrames + frame });
  } else if (id === "Agenda") {
    jobs.push({ id, name: id, frame: 0 });
  } else {
    jobs.push({ id, name: id, frame });
  }
}

await fs.mkdir(outDir, { recursive: true });

// The event's own assets/ folder, served at events/<id>/assets/ next to ../public.
let publicDir = path.join(root, "public");
let tempPublic = null;
const eventAssets = path.join(path.dirname(eventPath), "assets");
// The folders shared by every meetup (people/, logos/, badges/, community/),
// two up from the event file (meetup-event-vienna/<folder>/), served at their
// own name like the web player serves them.
const SHARED = ["people", "logos", "badges", "community"];
const sharedRoot = path.resolve(root, arg("shared", path.join(path.dirname(eventPath), "..", "..")));
const isDir = (dir) => fs.stat(dir).then((st) => st.isDirectory(), () => false);
const withAssets = await isDir(eventAssets);
const eventText = JSON.stringify(event) + (archive ? JSON.stringify(archive) : "");
const shared = [];
for (const name of SHARED) {
  if (eventText.includes(`"${name}/`) && (await isDir(path.join(sharedRoot, name)))) shared.push(name);
}
if (withAssets || shared.length) {
  tempPublic = await fs.mkdtemp(path.join(os.tmpdir(), "meetup-stills-public-"));
  await fs.cp(publicDir, tempPublic, { recursive: true });
  publicDir = tempPublic;
}
if (withAssets) {
  await fs.cp(eventAssets, path.join(tempPublic, "events", event.id, "assets"), { recursive: true });
  console.log(`event assets: ${eventAssets} as events/${event.id}/assets/`);
}
for (const name of shared) {
  await fs.cp(path.join(sharedRoot, name), path.join(tempPublic, name), { recursive: true });
  console.log(`${name}: ${path.join(sharedRoot, name)} as ${name}/`);
}

process.stdout.write("bundling... ");
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  publicDir,
  onProgress: () => undefined,
});
console.log("done");

let failed = 0;
for (const job of jobs) {
  const inputProps = { event, ...(job.segmentId ? { segmentId: job.segmentId } : {}), ...(job.index !== undefined ? { index: job.index } : {}), ...(ARCHIVE_SCENES.has(job.id) && archive ? { archive } : {}) };
  const output = path.join(outDir, `${job.name}.png`);
  try {
    const composition = await selectComposition({ serveUrl, id: job.id, inputProps });
    await renderStill({
      composition,
      serveUrl,
      output,
      frame: Math.min(job.frame, composition.durationInFrames - 1),
      imageFormat: "png",
      scale,
      overwrite: true,
      inputProps,
    });
    console.log(`  ${path.relative(root, output)}`);
  } catch (err) {
    failed += 1;
    console.log(`  ${job.name}  FAILED: ${String(err?.message ?? err).split("\n")[0]}`);
  }
}

if (tempPublic) await fs.rm(tempPublic, { recursive: true, force: true });
console.log(`\n${jobs.length - failed}/${jobs.length} from ${path.relative(root, eventPath)} written to ${path.relative(root, outDir)} at ${scale}x`);
process.exit(failed ? 1 : 0);

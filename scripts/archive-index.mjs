/**
 * Writes the meetup archive for the meetup page's header ("Our meetups",
 * "Our hosts and sponsors"): one entry per meetup of the events repository.
 *
 *   node scripts/archive-index.mjs [--events ../meetup-event-vienna] [--out web-player/public/events/archive.json]
 *
 * Reads every <events>/events/<id>/meetup.json (id, title, number, start,
 * venue, hosts, stream) and, where the folder has one, its event.json for the
 * hosts' logos and links (sponsors[].logo: the dark-screen files,
 * logos/<file> or events/<id>/assets/<file>; sponsors[].url). A host without
 * a logo there gets the one <events>/logos.json registers for its name or an
 * alias, when that file exists; never one looked up any other way. The
 * registry's name is used for a host it knows, so "Bytesource" and
 * "ByteSource" are one host.
 *
 * The light plates of the header's "Our meetups" and "Our hosts and sponsors"
 * need each logo in its colours for a light background, which the dark-screen
 * files are not (white lettering). They come from the website's own sponsor
 * logos (--plate-logos, default ../aws-community-austria-website/public/assets/sponsors,
 * <stem>.svg or .png for the registry file's stem, "tu-wien" as tu_wien):
 * copied into public/logos-light/ (served as logos-light/ by Studio, the
 * stills and the player build) and set as hosts[].plateLogo. Without the
 * folder, or without a file for a host, there is no plateLogo and the plate
 * shows the host's name.
 *
 * Output: { version: 1, meetups: [...] }, newest first, validated against
 * src/archive.ts by the player when it loads it. `make player-event` runs
 * this. Deterministic: no timestamps, same input, same file.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const eventsRepo = path.resolve(root, arg("events", "../meetup-event-vienna"));
const out = path.resolve(root, arg("out", "web-player/public/events/archive.json"));
const eventsDir = path.join(eventsRepo, "events");
const plateSrc = path.resolve(root, arg("plate-logos", "../aws-community-austria-website/public/assets/sponsors"));
const plateOut = path.join(root, "public", "logos-light");

if (!fs.existsSync(eventsDir)) {
  console.error(`archive-index: no events folder at ${eventsDir} (pass --events <meetup-event-vienna>)`);
  process.exit(1);
}

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw new Error(`${file}: ${err.message}`);
  }
};

const key = (name) =>
  String(name)
    .replace(/,?\s+(AG|GmbH|SE|Inc\.?|Ltd\.?|LLC|S\.A\.|B\.V\.|s\.r\.o\.)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const registry = (readJson(path.join(eventsRepo, "logos.json")) ?? []).map((r) => ({
  name: r.name,
  logo: r.logo,
  keys: new Set([r.name, ...(r.aliases ?? [])].map(key)),
}));
const known = (name) => registry.find((r) => r.keys.has(key(name)));
const fileExists = (rel) => typeof rel === "string" && fs.existsSync(path.join(eventsRepo, rel));

/** The light-background logo for a dark-screen logo file, copied into public/logos-light/; undefined without one. */
const plateCopied = new Set();
const plateFor = (darkLogo) => {
  if (typeof darkLogo !== "string" || !fs.existsSync(plateSrc)) return undefined;
  const stem = path.basename(darkLogo).replace(/\.[a-z]+$/i, "");
  for (const candidate of [stem, stem.replace(/-/g, "_")]) {
    for (const ext of [".svg", ".png"]) {
      const file = path.join(plateSrc, candidate + ext);
      if (!fs.existsSync(file)) continue;
      const name = `${stem}${ext}`;
      if (!plateCopied.has(name)) {
        fs.mkdirSync(plateOut, { recursive: true });
        fs.copyFileSync(file, path.join(plateOut, name));
        plateCopied.add(name);
      }
      return `logos-light/${name}`;
    }
  }
  return undefined;
};

const isIso = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/.test(v);

const meetups = [];
const skipped = [];
for (const folder of fs.readdirSync(eventsDir).sort()) {
  const dir = path.join(eventsDir, folder);
  if (!fs.statSync(dir).isDirectory()) continue;
  const m = readJson(path.join(dir, "meetup.json"));
  if (!m) continue;
  if (m.version !== 1 || typeof m.id !== "string" || typeof m.title !== "string" || !isIso(m.start) || !m.venue?.name) {
    skipped.push(`${folder}: meetup.json is missing id, title, start or venue`);
    continue;
  }
  const event = readJson(path.join(dir, "event.json"));
  const sponsors = event?.sponsors ?? [];
  const hosts = (Array.isArray(m.hosts) ? m.hosts : []).filter((h) => typeof h?.name === "string" && h.name.trim()).map((h, i) => {
    const reg = known(h.name);
    // The event's sponsor of the same name (or the only sponsor, for the only host).
    const s =
      sponsors.find((x) => key(x.name) === key(h.name) || (x.short && key(x.short) === key(h.name)) || (reg && reg.keys.has(key(x.name)))) ??
      (m.hosts.length === 1 && sponsors.length === 1 ? sponsors[0] : undefined);
    const logo = (fileExists(s?.logo) && s.logo) || (fileExists(reg?.logo) && reg.logo) || undefined;
    const url = (typeof h.url === "string" && h.url) || (typeof s?.url === "string" && s.url) || undefined;
    const plateLogo = plateFor(reg?.logo ?? logo);
    return { name: reg?.name ?? h.name.trim(), ...(url ? { url } : {}), ...(logo ? { logo } : {}), ...(plateLogo ? { plateLogo } : {}) };
  });
  meetups.push({
    id: m.id,
    title: m.title,
    ...(Number.isInteger(m.number) && m.number > 0 ? { number: m.number } : {}),
    start: m.start,
    venue: { name: m.venue.name, ...(m.venue.address ? { address: m.venue.address } : {}) },
    hosts,
    stream: m.stream === true,
  });
}
meetups.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify({ version: 1, meetups }, null, 2)}\n`);
for (const s of skipped) console.warn(`  skipped ${s}`);
if (plateCopied.size) {
  fs.writeFileSync(
    path.join(plateOut, "README.md"),
    "Written by `scripts/archive-index.mjs` (`make player-event`): the hosts' logos in their colours for a light background, copied from the website's `public/assets/sponsors/` (see its README for each file's source), for the light plates of the header's \"Our meetups\" and \"Our hosts and sponsors\". Do not edit by hand.\n",
  );
}
console.log(`${path.relative(root, out)}: ${plateCopied.size} light-plate logos in public/logos-light/, ${meetups.length} meetups, ${new Set(meetups.flatMap((m) => m.hosts.map((h) => key(h.name)))).size} hosts`);

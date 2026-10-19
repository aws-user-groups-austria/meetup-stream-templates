/**
 * Check the built player in headless Chrome, the way it will be served: the
 * dist folder under /present/ behind a plain static server (python3 -m
 * http.server), opened at simulated times with ?at=, then driven with the
 * clicker keys. One PNG per check into out/check/, and a pass/fail line per
 * check from the page's own data-scene / data-mode attributes.
 *
 *   node scripts/screenshots.mjs              builds first
 *   node scripts/screenshots.mjs --no-build   uses the existing dist/
 *   node scripts/screenshots.mjs --dev        against the Vite dev server instead (no build)
 *   node scripts/screenshots.mjs --wrap       also holds one scene past its 62 s loop (adds a minute)
 *
 * Starts its own server and Chrome on spare ports and stops both on exit.
 * Set CHROME=/path/to/chrome if Chrome is not in the usual place.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
const DEV = process.argv.includes("--dev");
const out = path.join(root, "out", DEV ? "check-dev" : "check");
const EVENT = "2026-10-20-aws-meetup-vienna-53";
const HTTP_PORT = 4180;
const CDP_PORT = 9420;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const children = [];
const temp = [];
const cleanup = () => {
  for (const c of children) {
    try {
      // npx vite runs in its own process group (detached), so the whole group goes.
      if (c.spawnargs[0] === "npx") process.kill(-c.pid, "SIGTERM");
      else c.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
  for (const dir of temp) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    } catch {
      /* the OS cleans tmp */
    }
  }
};
process.on("exit", cleanup);
process.on("SIGINT", () => process.exit(130));
process.on("SIGTERM", () => process.exit(143));

const WRAP = process.argv.includes("--wrap");
const DEV_PORT = 4170;

if (!DEV && !process.argv.includes("--no-build")) {
  const r = spawnSync("npx", ["vite", "build"], { cwd: root, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
if (!DEV && !fs.existsSync(path.join(dist, "index.html"))) {
  console.error("No dist/index.html: run npm run build first.");
  process.exit(1);
}
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const findChrome = () =>
  [
    process.env.CHROME,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]
    .filter(Boolean)
    .find((c) => fs.existsSync(c));

const chrome = findChrome();
if (!chrome) {
  console.error("No Chrome found. Set CHROME=/path/to/chrome.");
  process.exit(1);
}

if (DEV) {
  children.push(spawn("npx", ["vite", "--port", String(DEV_PORT), "--strictPort"], { cwd: root, stdio: "ignore", detached: true }));
} else {
  // A site root with the build at /present/, like the website serves it.
  const site = fs.mkdtempSync(path.join(os.tmpdir(), "meetup-live-site-"));
  temp.push(site);
  fs.symlinkSync(dist, path.join(site, "present"), "dir");
  children.push(
    spawn("python3", ["-m", "http.server", String(HTTP_PORT), "--bind", "127.0.0.1", "--directory", site], { stdio: "ignore" }),
  );
}
const base = DEV ? `http://127.0.0.1:${DEV_PORT}/` : `http://127.0.0.1:${HTTP_PORT}/present/`;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "meetup-live-chrome-"));
temp.push(profile);
children.push(
  spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--autoplay-policy=no-user-gesture-required",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  ),
);

const waitFor = async (url, seconds) => {
  for (let i = 0; i < seconds * 4; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error(`timed out waiting for ${url}`);
};
await waitFor(base, 60);
await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`, 30);

const target = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result ?? m.error);
    pending.delete(m.id);
    return;
  }
  if (m.method === "Network.responseReceived" && m.params.response.status >= 400) {
    problems.push(`HTTP ${m.params.response.status} ${m.params.response.url}`);
  }
  if (m.method === "Runtime.exceptionThrown") {
    problems.push(`exception: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`);
  }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    problems.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
  }
};
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++seq;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "evaluate failed");
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
const viewport = (width, height) =>
  send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
await viewport(1920, 1080);

const state = () =>
  evaluate(`(() => {
    const s = document.querySelector("[data-scene]");
    const err = document.querySelector("[data-error]");
    return {
      scene: s?.dataset.scene ?? null,
      segment: s?.dataset.segment ?? null,
      mode: s?.dataset.mode ?? null,
      black: s ? s.hasAttribute("data-black") : null,
      help: !!document.querySelector("[data-help]"),
      helpText: document.querySelector("[data-help]")?.innerText ?? null,
      delay: s?.dataset.delayMin === undefined ? null : Number(s.dataset.delayMin),
      sceneError: !!document.querySelector("[data-scene-error]"),
      error: err?.dataset.error ?? null,
      fonts: document.fonts.status,
      fontsLoaded: [...document.fonts].filter((f) => ["Amazon Ember", "Inter"].includes(f.family.replace(/"/g, "")) && f.status === "loaded").length,
      ember: [...document.fonts].some((f) => f.family.replace(/"/g, "") === "Amazon Ember" && f.status === "loaded"),
      links: [...document.querySelectorAll("[data-links] a")].map((a) => a.getAttribute("data-link")),
      upcoming: document.querySelector("[data-upcoming]")?.getAttribute("data-upcoming") ?? null,
      countdownLabel: document.querySelector("[data-countdown-top]")?.getAttribute("data-countdown-top") ?? null,
      countdown: document.querySelector("[data-countdown-value]")?.textContent ?? null,
      photosLoaded: [...document.querySelectorAll("img[data-photo]")].every((i) => i.complete && i.naturalWidth > 0),
    };
  })()`);

const open = async (query, settleMs = 3200) => {
  await send("Page.navigate", { url: `${base}${query}` });
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    const s = await state().catch(() => null);
    if (s && (s.scene || s.error)) break;
  }
  await evaluate("document.fonts.ready.then(() => true)");
  await sleep(settleMs);
};
const shoot = async (file) => {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(out, `${file}.png`), Buffer.from(data, "base64"));
};
const KEYS = {
  PageDown: { code: "PageDown", key: "PageDown", windowsVirtualKeyCode: 34 },
  PageUp: { code: "PageUp", key: "PageUp", windowsVirtualKeyCode: 33 },
  ArrowRight: { code: "ArrowRight", key: "ArrowRight", windowsVirtualKeyCode: 39 },
  ArrowLeft: { code: "ArrowLeft", key: "ArrowLeft", windowsVirtualKeyCode: 37 },
  Space: { code: "Space", key: " ", windowsVirtualKeyCode: 32 },
  A: { code: "KeyA", key: "a", windowsVirtualKeyCode: 65 },
  B: { code: "KeyB", key: "b", windowsVirtualKeyCode: 66 },
  Help: { code: "Slash", key: "?", windowsVirtualKeyCode: 191, modifiers: 8 },
  Plus: { code: "Equal", key: "+", windowsVirtualKeyCode: 187, modifiers: 8 },
  Minus: { code: "Minus", key: "-", windowsVirtualKeyCode: 189 },
  Zero: { code: "Digit0", key: "0", windowsVirtualKeyCode: 48 },
};
const press = async (name, settleMs = 2800) => {
  for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, ...KEYS[name] });
  await sleep(settleMs);
};
const click = async (x, y, settleMs = 2800) => {
  for (const type of ["mousePressed", "mouseReleased"]) {
    await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  }
  await sleep(settleMs);
};

const results = [];
const expect = async (file, want) => {
  await shoot(file);
  const got = await state();
  const fails = Object.entries(want).filter(([k, v]) =>
    v instanceof RegExp ? !v.test(String(got[k] ?? "")) : got[k] !== v,
  );
  if (got.scene && got.fontsLoaded === 0) fails.push(["fontsLoaded", ">0"]);
  if (got.scene && !got.photosLoaded) fails.push(["photosLoaded", true]);
  results.push({ file, ok: fails.length === 0, got, fails });
  const mark = fails.length === 0 ? "ok  " : "FAIL";
  console.log(
    `${mark} ${file.padEnd(34)} scene=${got.scene ?? "-"} segment=${got.segment || "-"} mode=${got.mode ?? "-"}` +
      `${got.black ? " black" : ""}${got.help ? " help" : ""}${got.error ? ` error="${got.error}"` : ""} font=${got.ember ? "ember" : "inter"}${got.upcoming ? ` upcoming="${got.upcoming}"` : ""}` +
      (fails.length ? `  expected ${fails.map(([k, v]) => `${k}=${v}`).join(" ")}` : ""),
  );
};

const q = (at, extra = "") => `?event=${EVENT}&at=${at}${extra}`;

// ---------------------------------------------------------------- by the clock
const TIMES = [
  ["16:55", "PreShow", "doors"],
  ["17:30", "PreShow", "doors"],
  ["18:00:20", "Welcome", "welcome"],
  ["18:02", "WhatWeDo", "welcome"],
  ["18:07", "SponsorHandover", "sponsor"],
  ["18:10", "SpeakerHandover", "talk-1"],
  ["18:30", "NowSpeaking", "talk-1"],
  ["18:55", "Break", "break-1"],
  ["19:21", "SpeakerHandover", "talk-2"],
  ["20:30", "Closing", "closing"],
  ["22:05", "AfterEnd", ""],
];
for (const [at, scene, segment] of TIMES) {
  await open(q(at));
  await expect(`at-${at.replaceAll(":", "")}`, { scene, segment, mode: "auto" });
}

// ---------------------------------------------------------------- the clicker
await open(q("18:07"));
await press("PageDown");
await expect("keys-1-pagedown", { scene: "SpeakerHandover", segment: "talk-1", mode: "manual" });
await press("PageDown");
await expect("keys-2-pagedown", { scene: "NowSpeaking", segment: "talk-1", mode: "manual" });
await press("PageUp");
await expect("keys-3-pageup", { scene: "SpeakerHandover", segment: "talk-1", mode: "manual" });
await press("A");
await expect("keys-4-a-back-to-clock", { scene: "SponsorHandover", segment: "sponsor", mode: "auto" });
await press("ArrowRight", 600);
await press("Space", 600);
await expect("keys-5-arrow-space", { scene: "NowSpeaking", mode: "manual" });
await press("ArrowLeft", 600);
await press("A", 600);
await click(960, 540);
await expect("keys-6-click", { scene: "SpeakerHandover", mode: "manual" });
await press("Help", 800);
await expect("keys-7-help", { help: true, mode: "manual" });
await press("Help", 400);
await press("A", 400);
await press("B", 800);
await expect("keys-8-black", { black: true, scene: "SponsorHandover" });
await press("B");
await expect("keys-9-unblack", { black: false, scene: "SponsorHandover" });

// ---------------------------------------------------------------- the next community day
// Never by the clock; one press away during the break and after the closing.
await open(q("18:55"));
await press("PageDown");
await expect("upcoming-1-break-next", { scene: "Upcoming", segment: "break-1", mode: "manual", upcoming: "AWS Community Day Adria" });
await press("PageUp");
await expect("upcoming-2-back-to-break", { scene: "Break", segment: "break-1", mode: "auto" });
await open(q("20:30"));
await press("ArrowRight");
await expect("upcoming-3-closing-next", { scene: "Upcoming", segment: "closing", mode: "manual", upcoming: "AWS Community Day Adria" });
await press("ArrowRight");
await expect("upcoming-4-then-afterend", { scene: "AfterEnd", mode: "manual" });
// The pre-show's upcoming panel, the fourth of five 12 s panels: wait for it (headless
// Chrome can play a little slower than the clock), at most two loops.
await open(q("17:30"), 500);
for (let i = 0; i < 120 && !(await state()).upcoming; i++) await sleep(1000);
await sleep(1500);
await expect("upcoming-5-preshow-panel", { scene: "PreShow", upcoming: "AWS Community Day Adria" });

// ---------------------------------------------------------------- the countdown top right
// It ticks with the clock, and stepping or the delay keys do not change it.
{
  const secs = (v) => {
    const m = /^(\d\d):(\d\d)$/.exec(v ?? "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  await open(q("18:55"), 1500);
  const a = await state();
  await sleep(3000);
  const b = await state();
  const ticks = a.countdownLabel === "Talk 2 in" && secs(a.countdown) - secs(b.countdown) >= 2;
  results.push({ file: "countdown-1-ticks", ok: ticks, got: b, fails: ticks ? [] : [["countdown", `${a.countdown} -> ${b.countdown}`]] });
  console.log(`${ticks ? "ok  " : "FAIL"} countdown-1-ticks                  ${a.countdownLabel} ${a.countdown} -> ${b.countdown}`);
  await press("PageDown", 600);
  await press("ArrowLeft", 600);
  await press("ArrowLeft", 600);
  for (let i = 0; i < 3; i++) await press("Plus", 150);
  const c = await state();
  await shoot("countdown-2-after-stepping");
  const elapsed = secs(b.countdown) - secs(c.countdown);
  const same = c.mode === "manual" && c.delay === 3 && c.countdownLabel === "Talk 2 in" && elapsed >= 1 && elapsed <= 8;
  results.push({ file: "countdown-2-after-stepping", ok: same, got: c, fails: same ? [] : [["countdown", `${b.countdown} -> ${c.countdown} (${c.countdownLabel}, ${c.mode}, delay ${c.delay})`]] });
  console.log(`${same ? "ok  " : "FAIL"} countdown-2-after-stepping         scene=${c.scene} mode=${c.mode} delay=${c.delay} ${c.countdownLabel} ${c.countdown}`);
}

// ---------------------------------------------------------------- the bottom bar's chapters
// A click on a chapter jumps there (manual mode); A goes back to the clock.
const chapterAt = (id) =>
  evaluate(`(() => { const r = document.querySelector('[data-chapter="${id}"]')?.getBoundingClientRect(); return r ? [r.x + r.width / 2, r.y + r.height / 2] : null; })()`);
await open(q("18:30"));
{
  const at = await chapterAt("talk-2");
  if (at) await click(at[0], at[1]);
  await expect("chapter-1-click-talk-2", { scene: "SpeakerHandover", segment: "talk-2", mode: "manual" });
  const back = await chapterAt("sponsor");
  if (back) await click(back[0], back[1]);
  await expect("chapter-2-click-sponsor", { scene: "SponsorHandover", segment: "sponsor", mode: "manual" });
  await press("A");
  await expect("chapter-3-a-back-to-clock", { scene: "NowSpeaking", segment: "talk-1", mode: "auto" });
}

// ---------------------------------------------------------------- links for the host
// They show on mouse movement and hide again after 3 s; never part of the scene.
await open(q("18:30"));
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 400, y: 300 });
await sleep(400);
await expect("links-1-on-mouse-move", { links: /Meetup event,Meetup page,Feedback,AWS Community Day Adria/ });
await sleep(3600);
await expect("links-2-hidden-after-3s", { links: /^$/ });

// ---------------------------------------------------------------- the clock runs
// 18:11:00 at 10x: the 30 simulated seconds to the end of the handover take 3 s.
await open(q("18:11:00", "&speed=10"), 300);
await expect("speed-1-before", { scene: "SpeakerHandover", mode: "auto" });
await sleep(3500);
await expect("speed-2-after", { scene: "NowSpeaking", mode: "auto" });
// An early "next" before 18:10 is released when the clock reaches 18:10.
await open(q("18:09:20", "&speed=10"), 300);
await press("PageDown", 300);
await expect("pin-1-early-next", { scene: "SpeakerHandover", mode: "manual" });
await sleep(4500);
await expect("pin-2-clock-caught-up", { scene: "SpeakerHandover", mode: "auto" });
// Help with a rehearsal clock running.
await open(q("18:49:50", "&speed=10"), 1500);
await press("Help", 800);
await expect("help-rehearsal", { help: true, scene: "Break" });

// Before doors open the help names no current segment, and doors as the next one.
await open(q("16:55"), 1500);
await press("Help", 800);
await expect("help-before-doors", {
  help: true,
  scene: "PreShow",
  helpText: /Segment\s+none yet, doors open at 17:00[\s\S]*Next segment\s+Entry & Networking/,
});

// ---------------------------------------------------------------- running late
// 18:49:55, five minutes late: + five times, and at 18:50 the first talk is still on.
await open(q("18:49:55"), 300);
for (let i = 0; i < 5; i++) await press("Plus", 150);
await sleep(6500);
await expect("late-1-talk-runs-on", { scene: "NowSpeaking", segment: "talk-1", mode: "auto", delay: 5 });
await press("Help", 800);
await expect("late-2-help", { help: true, helpText: /Delay\s+\+5 min/ });
await press("Help", 300);
await press("Minus", 300);
await expect("late-3-minus", { delay: 4, scene: "NowSpeaking" });
await press("Zero", 1500);
await expect("late-4-zero-back-to-agenda", { delay: 0, scene: "Break", segment: "break-1", mode: "auto" });
// At 60x: +5 before 18:50, the talk ends at 18:55 and the break counts to 19:25 ("Back at 19:25").
await open(q("18:49:00", "&speed=60"), 300);
for (let i = 0; i < 5; i++) await press("Plus", 100);
await sleep(7000);
await expect("late-5-break-moved", { delay: 5, scene: "Break", segment: "break-1", mode: "auto" });
// The delay lives in memory: a reload is back on the agenda's times.
await open(q("18:52:00"), 300);
await expect("late-6-reload-forgets", { delay: 0, scene: "Break" });

// ---------------------------------------------------------------- a scene that throws
// A feedback link too long for a QR code makes the Closing scene throw. The
// stage shows its plain-text fallback, not the Player's default emoji.
{
  const broken = JSON.parse(fs.readFileSync(path.join(root, "public/events", `${EVENT}.json`), "utf8"));
  broken.links.feedback = `https://example.org/?${"a".repeat(4000)}`;
  const mark = problems.length;
  await open(`?event=${encodeURIComponent(`data:application/json,${encodeURIComponent(JSON.stringify(broken))}`)}&at=20:30`, 1500);
  await expect("scene-error-fallback", { scene: "Closing", sceneError: true });
  const text = await evaluate(`document.querySelector("[data-scene-error]")?.innerText ?? ""`);
  const emoji = /\p{Extended_Pictographic}/u.test(text);
  results.push({ file: "scene-error-no-emoji", ok: !emoji && /could not be shown/.test(text), got: {}, fails: [] });
  console.log(`${!emoji ? "ok  " : "FAIL"} scene-error-no-emoji                text="${text.split("\n")[1] ?? ""}"`);
  // React reports the deliberate error on the console; it is expected here.
  const dropped = problems.splice(mark);
  console.log(`     (${dropped.length} expected console reports of the deliberate scene error)`);
}

// ---------------------------------------------------------------- the meetup page's header (?embed=1)
// The real clock only, so what it shows depends on the day: the tour before doors and after the
// end, the clock during the evening. Checked at the size of the website's hero.
{
  await viewport(535, 301);
  await open(`?event=${EVENT}&embed=1`, 2500);
  const header = () =>
    evaluate(`(() => {
      const d = document.querySelector("[data-embed]");
      const layer = [...document.querySelectorAll("[data-layer]")].at(-1);
      return {
        phase: d?.dataset.phase ?? null,
        source: d?.dataset.source ?? null,
        scene: d?.dataset.scene ?? null,
        dots: [...document.querySelectorAll("[data-dot]")].map((b) => b.title),
        pill: document.querySelector("[data-pill]")?.dataset.pill ?? "",
        progress: !!document.querySelector("[data-progress]"),
        links: [...(layer?.querySelectorAll("a[data-link]") ?? [])].map((a) => a.getAttribute("href") + " " + a.target),
      };
    })()`);
  const check = (file, ok, detail) => {
    results.push({ file, ok, got: {}, fails: ok ? [] : [["embed", detail]] });
    console.log(`${ok ? "ok  " : "FAIL"} ${file.padEnd(34)} ${detail}`);
  };
  const h = await header();
  await shoot("embed-1-hero");
  if (h.phase === "open") {
    check("embed-1-live", h.source === "live" && h.pill === "Live now" && h.dots.length === 0, `${h.phase} ${h.source} "${h.pill}"`);
  } else {
    // The calm tour: the screens that read at header size (no agenda, no welcome screens), no pill while it just runs.
    const tourOk = h.source === "tour" && h.progress && h.dots.length >= 6 && !h.dots.includes("Agenda") && ["Event", "Our host", "Our meetups", "Our sponsors"].every((d) => h.dots.includes(d)) && h.pill === "";
    check("embed-1-tour", tourOk, `${h.phase} ${h.scene} ${h.dots.length} dots, "${h.pill}"`);
    const dot = await evaluate(`(() => { const r = document.querySelector('[data-dot="1"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
    await click(dot[0], dot[1], 1500);
    const a = await header();
    await shoot("embed-2-dot-host");
    const site = a.links.filter((l) => l.endsWith(" _blank"));
    check("embed-2-dot-host", a.scene === "SponsorHandover" && a.source === "tour" && site.length >= 1 && a.pill === "", `${a.scene} ${a.source}, ${site.length} links to the host, "${a.pill}"`);
    await click(20, 280, 1200);
    const v = await header();
    check("embed-3-stage-click-visit", v.source === "visit" && v.scene === "SpeakerHandover" && /back to the tour in \d+ s/i.test(v.pill), `${v.scene} ${v.source} "${v.pill}"`);
  }
  await viewport(1920, 1080);
}

// ---------------------------------------------------------------- shapes and errors
await viewport(1600, 1200);
await open(q("18:00:20"));
await expect("letterbox-1600x1200", { scene: "Welcome" });
await viewport(1920, 1080);
await open("?event=no-such-event", 800);
await expect("error-not-found", { error: "Event not found" });
await open("", 800);
await expect("error-no-event", { error: "No event given" });
await open("?event=./index.html", 800);
await expect("error-html-not-event", { error: "Event not found" });
const invalid = { ...JSON.parse(fs.readFileSync(path.join(root, "public/events", `${EVENT}.json`), "utf8")), timezone: "UTC" };
invalid.segments[3].start = "18:10";
await open(`?event=${encodeURIComponent(`data:application/json,${encodeURIComponent(JSON.stringify(invalid))}`)}`, 800);
await expect("error-invalid-event", { error: "This event file does not match the event.json format" });
// A bad rehearsal parameter: the real clock runs and the help overlay says why.
await open(`?event=${EVENT}&at=late`, 1200);
await press("Help", 800);
await expect("help-bad-param", { help: true });

if (WRAP) {
  // Welcome is 2 s of entrance and a 60 s loop. Hold it past the wrap; it must still be there and moving.
  await open(q("18:01"), 500);
  await shoot("wrap-0s");
  await sleep(64_000);
  await expect("wrap-64s", { scene: "Welcome", mode: "auto" });
}

ws.close();
const failed = results.filter((r) => !r.ok);
// Expected: the three error checks ask for files that do not exist.
// React 18's development build warns about remotion 4.0.530 passing `ref` through
// AbsoluteFill as a plain prop (a React 19 idiom). Dev server only, harmless:
// no scene puts a ref on AbsoluteFill. The production build has no such warning.
const DEV_REF_WARNING = /`ref` is not a prop|Function components cannot be given refs/;
const known = problems.filter((p) => DEV && DEV_REF_WARNING.test(p));
const unexpected = problems.filter((p) => !/no-such-event\.json|favicon\.ico/.test(p) && !known.includes(p));
if (known.length) console.log(`${known.length} known React 18 dev-mode ref warnings from remotion (see the comment in this script)`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed against ${base}; screenshots in ${path.relative(process.cwd(), out)}`);
if (unexpected.length) console.log(`page problems:\n  ${[...new Set(unexpected.map((p) => p.split("\n")[0]))].join("\n  ")}`);
else console.log("no failed requests, exceptions or console errors (besides the deliberate 404)");
process.exit(failed.length || unexpected.length ? 1 : 0);

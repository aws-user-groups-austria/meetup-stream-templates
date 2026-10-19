import { describe, expect, it } from "vitest";
import real from "../public/events/2026-10-20-aws-meetup-vienna-53.json";
import { eventUrlFor, loadEvent } from "./loadEvent";

const PAGE = "https://awscommunity.at/present/?event=2026-10-20-aws-meetup-vienna-53";

const respond = (body: string, init: ResponseInit & { headers?: Record<string, string> } = {}) =>
  (async () => new Response(body, { status: 200, headers: { "content-type": "application/json" }, ...init })) as unknown as typeof fetch;

describe("?event", () => {
  it("an id resolves to ./events/<id>.json next to the page", () => {
    expect(eventUrlFor("2026-10-20-aws-meetup-vienna-53", PAGE)).toBe(
      "https://awscommunity.at/present/events/2026-10-20-aws-meetup-vienna-53.json",
    );
  });

  it("a URL is used as it is, a relative path against the page", () => {
    expect(eventUrlFor("https://example.org/e.json", PAGE)).toBe("https://example.org/e.json");
    expect(eventUrlFor("../data/e.json", PAGE)).toBe("https://awscommunity.at/data/e.json");
  });

  it("missing or empty is null", () => {
    expect(eventUrlFor(null, PAGE)).toBeNull();
    expect(eventUrlFor("  ", PAGE)).toBeNull();
  });
});

describe("loading", () => {
  it("loads and validates the real event", async () => {
    const r = await loadEvent("2026-10-20-aws-meetup-vienna-53", PAGE, respond(JSON.stringify(real)));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.event.segments).toHaveLength(7);
  });

  it("no ?event explains how to open it", async () => {
    const r = await loadEvent(null, PAGE, respond("{}"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.detail).toContain("?event=");
  });

  it("404, and a host answering with index.html, are 'Event not found'", async () => {
    const a = await loadEvent("nope", PAGE, respond("", { status: 404 }));
    const b = await loadEvent("nope", PAGE, respond("<!doctype html>", { headers: { "content-type": "text/html" } }));
    for (const r of [a, b]) {
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.title).toBe("Event not found");
    }
  });

  it("a network failure and broken JSON are reported", async () => {
    const down = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const a = await loadEvent("x", PAGE, down, 0);
    const b = await loadEvent("x", PAGE, respond("{ not json"));
    expect(!a.ok && a.error.title).toBe("Could not reach the event file");
    expect(!b.ok && b.error.title).toBe("The event file is not valid JSON");
  });

  it("schema problems are listed by path", async () => {
    const broken = { ...real, timezone: "UTC", segments: [{ ...real.segments[0], start: "18:00" }] };
    const r = await loadEvent("x", PAGE, respond(JSON.stringify(broken)));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.issues.some((i) => i.startsWith("timezone:"))).toBe(true);
      expect(r.error.issues.some((i) => i.startsWith("segments.0.start:"))).toBe(true);
    }
  });

  it("tries a few times when the network fails, so one dropped request on venue Wi-Fi is no error screen", async () => {
    let calls = 0;
    const flaky = (async () => {
      calls++;
      if (calls < 3) throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify(real), { headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
    const r = await loadEvent("2026-10-20-aws-meetup-vienna-53", PAGE, flaky, 0);
    expect(r.ok).toBe(true);
    expect(calls).toBe(3);
  });

  it("does not try again for a missing file", async () => {
    let calls = 0;
    const missing = (async () => {
      calls++;
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    const r = await loadEvent("nope", PAGE, missing, 0);
    expect(!r.ok && r.error.title).toBe("Event not found");
    expect(calls).toBe(1);
  });
});

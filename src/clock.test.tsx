import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LiveClockProvider } from "./clock";
import { Countdown } from "./components/Countdown";

const target = "2026-10-20T18:00:00+02:00";
const at = (local: string) => Date.parse(`2026-10-20T${local}+02:00`);

describe("Countdown and the LiveClock context", () => {
  it("shows the static fallback without a provider (Studio, renders)", () => {
    expect(renderToStaticMarkup(<Countdown targetIso={target} fallbackMs={60 * 60_000} />)).toContain("1:00:00");
    expect(renderToStaticMarkup(<Countdown targetIso={target} fallbackMs={30 * 60_000} />)).toContain("30:00");
  });

  it("counts from the provided clock", () => {
    const html = renderToStaticMarkup(
      <LiveClockProvider value={{ nowMs: at("17:45:30"), running: true }}>
        <Countdown targetIso={target} fallbackMs={60 * 60_000} />
      </LiveClockProvider>,
    );
    expect(html).toContain("14:30");
  });

  it("says so once the target has passed", () => {
    const html = renderToStaticMarkup(
      <LiveClockProvider value={{ nowMs: at("18:00:01"), running: true }}>
        <Countdown targetIso={target} fallbackMs={0} doneLabel="Starting now" />
      </LiveClockProvider>,
    );
    expect(html).toContain("Starting now");
  });
});

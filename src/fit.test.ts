import { describe, expect, it } from "vitest";
import raw from "../examples/event.sample.json";
import stressRaw from "../examples/event.stress.json";
import { agendaListHeight, fitAgenda } from "./components/AgendaList";
import { estimateLines, fitToken } from "./design/fit";
import { CONTENT_W, SPACE, STAGE_FILL, TYPE } from "./theme";
import { eventSchema } from "./event.schema";

const event = eventSchema.parse(raw);
const stress = eventSchema.parse(stressRaw);

describe("fitToken", () => {
  it("keeps the long talk title at Title size, within three lines (two on screen)", () => {
    const title = "Teaching an AI to Debug Our Cloud: AWS DevOps Agent in Practice";
    expect(fitToken(title, CONTENT_W, 3, ["title", "heading"])).toBe("title");
    expect(estimateLines(title, TYPE.title.size, CONTENT_W)).toBeLessThanOrEqual(3);
  });

  it("steps down a token, never to a size in between, when a title is too long", () => {
    const long = "A deliberately long talk title that goes on and on about cloud operations, agents, safety, trust and everything we learned along the way";
    expect(fitToken(long, CONTENT_W, 3, ["title", "heading"])).toBe("heading");
  });

  it("steps down when one long word would not fit the width", () => {
    expect(fitToken("Beispielgesellschaftsrechtsabteilung", 900, 3, ["title", "heading", "lead"])).toBe("lead");
  });
});

describe("fitAgenda", () => {
  const heading = TYPE.title.size * TYPE.title.lineHeight + SPACE.lg;

  it("shows the whole real agenda with its speakers on the agenda screen, leaving the stage its empty space", () => {
    const fit = fitAgenda(event.segments, { width: CONTENT_W, height: agendaListHeight() });
    expect(fit).toMatchObject({ speakers: true, from: 0, to: event.segments.length });
    expect(agendaListHeight()).toBeLessThanOrEqual(STAGE_FILL - heading + SPACE.x2);
  });

  it("windows a long agenda around the highlighted row at Small, never smaller", () => {
    const fit = fitAgenda(stress.segments, { width: CONTENT_W, height: 420, speakers: false, highlightId: "talk-2" });
    expect(fit.size).toBe("small");
    const ids = stress.segments.slice(fit.from, fit.to).map((s) => s.id);
    expect(ids).toContain("talk-2");
    expect(ids.length).toBeLessThan(stress.segments.length);
  });
});

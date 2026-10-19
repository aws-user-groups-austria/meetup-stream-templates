import { describe, expect, it } from "vitest";
import raw from "../examples/event.sample.json";
import { eventSchema } from "./event.schema";
import { SPEAKER_HANDOVER_MS, sceneFor, scenesInSegment } from "./sceneFor";

const event = eventSchema.parse(raw);
const seg = (id: string) => {
  const s = event.segments.find((x) => x.id === id);
  if (!s) throw new Error(`no segment ${id}`);
  return s;
};

describe("sceneFor on the 20 October evening", () => {
  it("doors are the pre-show", () => {
    expect(sceneFor(seg("doors"), 0)).toBe("PreShow");
    expect(sceneFor(seg("doors"), 59 * 60_000)).toBe("PreShow");
  });

  it("welcome, sponsor, break and closing map one to one", () => {
    expect(sceneFor(seg("welcome"), 0)).toBe("Welcome");
    expect(sceneFor(seg("sponsor"), 0)).toBe("SponsorHandover");
    expect(sceneFor(seg("break-1"), 0)).toBe("Break");
    expect(sceneFor(seg("closing"), 0)).toBe("Closing");
  });

  it("a talk is the handover for the first 90 s, then now speaking", () => {
    for (const id of ["talk-1", "talk-2"]) {
      expect(sceneFor(seg(id), 0)).toBe("SpeakerHandover");
      expect(sceneFor(seg(id), SPEAKER_HANDOVER_MS - 1)).toBe("SpeakerHandover");
      expect(sceneFor(seg(id), SPEAKER_HANDOVER_MS)).toBe("NowSpeaking");
      expect(sceneFor(seg(id), 39 * 60_000)).toBe("NowSpeaking");
    }
  });

  it("lists the scenes a segment steps through", () => {
    expect(scenesInSegment(seg("talk-1"))).toEqual(["SpeakerHandover", "NowSpeaking"]);
    expect(scenesInSegment(seg("break-1"))).toEqual(["Break"]);
  });
});

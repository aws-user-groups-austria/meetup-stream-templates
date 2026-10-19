import { describe, expect, it } from "vitest";
import { boldWidth, emberBoldWidth } from "./design/metrics";
import { TYPE } from "./theme";

describe("Amazon Ember Bold widths", () => {
  it("measures the Break card title on one line at Heading in Ember, but not in the Inter estimate", () => {
    const title = "I don't trust my agents!";
    const inner = 864 - 48 * 2;
    expect(emberBoldWidth(title, TYPE.heading.size)).toBeLessThanOrEqual(inner);
    expect(boldWidth(title, TYPE.heading.size, false)).toBeGreaterThan(inner);
    expect(boldWidth(title, TYPE.lead.size, false)).toBeLessThanOrEqual(inner);
  });

  it("counts a character it does not know as wide, so an estimate never comes out short", () => {
    expect(emberBoldWidth("\u4e2d", 100)).toBeGreaterThanOrEqual(70);
    expect(emberBoldWidth("Darko Mesaro\u0161", 34)).toBeGreaterThan(emberBoldWidth("Darko Mesaros", 34) - 1);
  });
});

import { describe, expect, it } from "vitest";
import {
  averageLeaning,
  isNewsSourceId,
  NEWS_SOURCE_PRESETS,
  NEWS_SOURCES,
  newsSourceName,
  ownershipLabel,
} from "./sources.ts";

describe("news source catalogue", () => {
  it("has unique ids and a rating link for every outlet", () => {
    const ids = NEWS_SOURCES.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const source of NEWS_SOURCES) {
      expect(source.ratingUrl).toMatch(/^https:\/\/mediabiasfactcheck\.com\/[\w-]+\/$/);
      expect(source.homepage).toMatch(/^https:\/\//);
    }
  });

  it("covers the whole spectrum", () => {
    const leanings = new Set(NEWS_SOURCES.map((source) => source.leaning));
    expect([...leanings].sort()).toEqual([
      "center",
      "center-left",
      "center-right",
      "left",
      "right",
    ]);
  });

  it("only uses known outlets in presets", () => {
    for (const preset of NEWS_SOURCE_PRESETS) {
      expect(preset.sources.every(isNewsSourceId)).toBe(true);
    }
  });
});

describe("ownershipLabel", () => {
  it("says öffentlich-rechtlich for German public broadcasters", () => {
    expect(ownershipLabel({ ownership: "public", country: "DE" })).toBe("Öffentlich-rechtlich");
    expect(ownershipLabel({ ownership: "public", country: "GB" })).toBe("Public service");
    expect(ownershipLabel({ ownership: "state", country: "QA" })).toBe("State-owned");
  });
});

describe("averageLeaning", () => {
  it("averages a selection on the five-step scale", () => {
    expect(averageLeaning([])).toBeNull();
    expect(averageLeaning(["tagesschau"])).toBe("center");
    expect(averageLeaning(["taz", "spiegel"])).toBe("center-left");
    expect(averageLeaning(["taz", "telegraph"])).toBe("center");
    expect(averageLeaning(["welt", "telegraph"])).toBe("right");
  });

  it("ignores unknown ids", () => {
    expect(averageLeaning(["retired", "faz"])).toBe("center-right");
    expect(newsSourceName("retired")).toBe("retired");
  });
});

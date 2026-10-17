import { describe, expect, it } from "vitest";
import {
  describeItem,
  formatList,
  type ListenerContext,
  partOfDay,
  SPOKEN_STATION_NAME,
  speechInstructions,
  systemPrompt,
  userPrompt,
} from "./prompts.ts";

const listener: ListenerContext = {
  name: "Ada",
  language: "en",
  hostStyle: "friendly",
  regionName: "Berlin",
  // 07:30 in Berlin (CEST, UTC+2)
  now: new Date("2026-10-16T05:30:00Z"),
};

describe("partOfDay", () => {
  it("uses German local time", () => {
    expect(partOfDay(new Date("2026-10-16T05:30:00Z"))).toBe("morning");
    expect(partOfDay(new Date("2026-10-16T12:00:00Z"))).toBe("afternoon");
    expect(partOfDay(new Date("2026-10-16T18:00:00Z"))).toBe("evening");
    expect(partOfDay(new Date("2026-10-16T23:30:00Z"))).toBe("night");
  });
});

describe("systemPrompt", () => {
  it("personalises the host", () => {
    const prompt = systemPrompt(listener);
    expect(prompt).toContain(SPOKEN_STATION_NAME);
    expect(prompt).toContain("Your listener is called Ada.");
    expect(prompt).toContain("Berlin");
    expect(prompt).toContain("morning");
    expect(prompt).toContain("Speak English only.");
    expect(prompt).toMatch(/No stage directions/);
  });

  it("omits personal details for shared clips", () => {
    const prompt = systemPrompt({ ...listener, name: null, regionName: null, language: "de" });
    expect(prompt).not.toContain("Ada");
    expect(prompt).not.toContain("Berlin");
    expect(prompt).toContain("Speak German only.");
  });

  it("changes persona with the host style", () => {
    expect(systemPrompt({ ...listener, hostStyle: "professional" })).toMatch(/No jokes/);
    expect(systemPrompt({ ...listener, hostStyle: "laidback" })).toMatch(/late-night/);
  });
});

describe("userPrompt", () => {
  it("builds an intro leading into a song", () => {
    const prompt = userPrompt({
      kind: "intro",
      next: { kind: "track", name: "Bohemian Rhapsody", artists: ["Queen"] },
    });
    expect(prompt).toContain('the song "Bohemian Rhapsody" by Queen');
    expect(prompt).toMatch(/at most three short sentences/);
  });

  it("does not leak song titles when the listener opted out", () => {
    const prompt = userPrompt({
      kind: "bridge",
      from: { kind: "music", count: 3 },
      to: { kind: "story", title: "DAX steigt", topline: "Börse" },
    });
    expect(prompt).toContain("some of the listener's favourite songs");
    expect(prompt).toContain('"DAX steigt" (Börse)');
    expect(prompt).toMatch(/Do not summarise the news yet/);
  });

  it("includes the article for news summaries", () => {
    const prompt = userPrompt({
      kind: "news",
      story: {
        source: "tagesschau",
        title: "T",
        topline: null,
        body: "Der Artikel.",
        fullArticle: true,
        ressort: "inland",
        regionName: null,
        others: [],
      },
    });
    expect(prompt).toContain("Present the following tagesschau report");
    expect(prompt).toContain("4 to 6 sentences");
    expect(prompt).not.toContain("Also reported:");
    expect(prompt).toContain("Title: T");
    expect(prompt).toContain("Section: inland");
    expect(prompt).toContain("Der Artikel.");
    expect(prompt).not.toContain("Region:");
  });

  it("asks for a careful, cited summary of teasers from several outlets", () => {
    const prompt = userPrompt({
      kind: "news",
      story: {
        source: "BBC News",
        title: "T",
        topline: null,
        body: "Teaser.",
        fullArticle: false,
        ressort: null,
        regionName: null,
        others: [{ source: "taz", title: "Titel", teaser: "Anriss." }],
      },
    });
    expect(prompt).toContain("You only have the outlet's teaser");
    expect(prompt).toContain("mentioning that taz reported it too");
    expect(prompt).toContain("- taz: Titel — Anriss.");
  });
});

describe("helpers", () => {
  it("formats artist lists naturally", () => {
    expect(formatList([])).toBe("");
    expect(formatList(["A"])).toBe("A");
    expect(formatList(["A", "B", "C"])).toBe("A, B and C");
  });

  it("describes the end of a segment", () => {
    expect(describeItem({ kind: "nothing" })).toBe("the end of the previous segment");
  });

  it("produces voice instructions per style and language", () => {
    expect(speechInstructions("professional", "de")).toMatch(/newsreader.*German/s);
  });
});

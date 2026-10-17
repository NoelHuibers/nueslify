import { describe, expect, it } from "vitest";
import { type CandidateStory, newsScore, rankStories } from "./ranking.ts";

const NOW = new Date("2026-10-17T12:00:00Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

function candidate(id: string, overrides: Partial<CandidateStory> = {}): CandidateStory {
  return {
    id,
    sourceId: "tagesschau",
    clusterId: id,
    ressort: null,
    regionId: null,
    title: id,
    topline: null,
    breaking: false,
    publishedAt: hoursAgo(1),
    bodyLength: 300,
    ...overrides,
  };
}

describe("newsScore", () => {
  it("halves every six hours and rewards wider coverage", () => {
    expect(newsScore({ latest: NOW, coverage: 1, breaking: false, now: NOW })).toBe(1);
    expect(newsScore({ latest: hoursAgo(6), coverage: 1, breaking: false, now: NOW })).toBe(0.5);
    expect(newsScore({ latest: hoursAgo(6), coverage: 4, breaking: false, now: NOW })).toBe(1.5);
    expect(newsScore({ latest: NOW, coverage: 1, breaking: true, now: NOW })).toBe(2);
  });
});

describe("rankStories", () => {
  it("collapses an event to its best report and lists the other outlets once each", () => {
    const [event] = rankStories(
      [
        candidate("dlf", { sourceId: "dlf", clusterId: "c1", bodyLength: 140 }),
        candidate("tagesschau", { clusterId: "c1", bodyLength: 4000, ressort: "inland" }),
        candidate("spiegel", { sourceId: "spiegel", clusterId: "c1", publishedAt: hoursAgo(0) }),
        candidate("spiegel-update", {
          sourceId: "spiegel",
          clusterId: "c1",
          publishedAt: hoursAgo(2),
        }),
      ],
      new Map([["c1", 5]]),
      NOW,
    );
    expect(event).toMatchObject({
      id: "tagesschau",
      ressort: "inland",
      coverage: 5,
      others: [
        { id: "spiegel", sourceId: "spiegel" },
        { id: "dlf", sourceId: "dlf" },
      ],
    });
  });

  it("takes section, region and breaking flag from any report of the event", () => {
    const [event] = rankStories(
      [
        candidate("a", { clusterId: "c1", bodyLength: 900 }),
        candidate("b", { sourceId: "zdf", clusterId: "c1", ressort: "ausland", breaking: true }),
        candidate("c", { sourceId: "dlf", clusterId: "c1", regionId: 9 }),
      ],
      new Map(),
      NOW,
    );
    expect(event).toMatchObject({ id: "a", ressort: "ausland", regionId: 9, breaking: true });
  });

  it("ranks widely covered events above fresher single-outlet stories", () => {
    const ranked = rankStories(
      [
        candidate("fresh", { publishedAt: NOW }),
        candidate("big", { clusterId: "c2", publishedAt: hoursAgo(3) }),
      ],
      new Map([["c2", 6]]),
      NOW,
    );
    expect(ranked.map((story) => story.id)).toEqual(["big", "fresh"]);
  });
});

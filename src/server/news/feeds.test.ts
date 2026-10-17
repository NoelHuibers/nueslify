import { describe, expect, it } from "vitest";
import { NEWS_SOURCE_IDS } from "#/lib/news/sources.ts";
import { allFeeds, feedsFor } from "./feeds.ts";

describe("feedsFor", () => {
  it("queries tagesschau only for the listener's sections and region", () => {
    const feeds = feedsFor({
      newsSources: ["tagesschau", "nzz"],
      categories: ["inland", "sport"],
      regionId: 3,
    });
    expect(feeds.map((feed) => feed.key)).toEqual([
      "tagesschau:ressort:inland",
      "tagesschau:ressort:sport",
      "tagesschau:region:3",
      "nzz:0",
      "nzz:1",
    ]);
  });

  it("uses every tagesschau section when none is picked", () => {
    const feeds = feedsFor({ newsSources: ["tagesschau"], categories: [], regionId: null });
    expect(feeds).toHaveLength(6);
  });
});

describe("allFeeds", () => {
  it("has at least one https feed for every outlet, with unique keys", () => {
    const feeds = allFeeds(NEWS_SOURCE_IDS);
    const keys = feeds.map((feed) => feed.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const id of NEWS_SOURCE_IDS) {
      expect(
        feeds.some((feed) => feed.sourceId === id),
        id,
      ).toBe(true);
    }
    for (const feed of feeds) {
      if (feed.kind === "rss") {
        expect(feed.url).toMatch(/^https:\/\//);
      }
    }
  });
});

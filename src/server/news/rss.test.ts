import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import fixtureFeeds from "./fixture-feeds.json" with { type: "json" };
import { fetchRssFeed, parseRss, type RssFeed, storyId } from "./rss.ts";
import { NO_VALIDATORS } from "./types.ts";

const NOW = new Date("2026-10-17T10:00:00Z");
const sample = readFileSync("test/fixtures/sample-rss.xml", "utf8");
const atom = readFileSync("test/fixtures/sample-atom.xml", "utf8");

const feed = (overrides: Partial<RssFeed> = {}): RssFeed => ({
  kind: "rss",
  key: "spiegel:0",
  sourceId: "spiegel",
  url: "https://www.example.de/index.rss",
  category: null,
  ...overrides,
});

describe("parseRss", () => {
  const items = parseRss(sample, feed(), NOW);

  it("keeps news and drops videos, live blogs, satire and entries without link or date", () => {
    expect(items.map((item) => item.title)).toEqual([
      "From the future",
      "Teaser only in content",
      "Johannes Winkel als Vorsitzender wiedergewählt",
    ]);
  });

  it("splits the kicker, strips HTML and decodes entities", () => {
    const winkel = items.find((item) => item.title.startsWith("Johannes"));
    expect(winkel).toMatchObject({
      topline: "Junge Union",
      firstSentence: "Johannes Winkel bleibt Chef der Jungen Union – mit seinem besten Ergebnis.",
      sourceId: "spiegel",
      ressort: "inland",
      regionId: null,
      detailsUrl: null,
    });
  });

  it("canonicalises links and derives a stable id from them", () => {
    const winkel = items.find((item) => item.title.startsWith("Johannes"));
    expect(winkel?.shareUrl).toBe(
      "https://www.example.de/politik/deutschland/junge-union-winkel-a-1.html?id=7",
    );
    expect(winkel?.id).toBe(storyId("spiegel", winkel?.shareUrl ?? ""));
    expect(winkel?.id).toMatch(/^spiegel:[\da-f]{20}$/);
  });

  it("falls back to content:encoded and infers sections from the URL", () => {
    const dax = items.find((item) => item.title === "Teaser only in content");
    expect(dax?.firstSentence).toContain("Der DAX hat am Freitag");
    expect(dax?.body).toContain("Technologiewerten");
    expect(dax?.ressort).toBe("wirtschaft");
    expect(dax?.publishedAt).toEqual(new Date("2026-10-17T08:00:00Z"));
  });

  it("clamps publish dates in the future to now", () => {
    expect(items[0]?.publishedAt).toEqual(NOW);
    expect(items[0]?.ressort).toBe("sport");
  });

  it("defaults international outlets to the World section", () => {
    const [entry] = parseRss(atom, feed({ sourceId: "bbc" }), NOW);
    expect(entry).toMatchObject({
      title: "Pope Leo recovering & resting",
      shareUrl: "https://news.example.com/world/europe/pope-1",
      ressort: "ausland",
    });
    const international = parseRss(sample, feed({ sourceId: "bbc" }), NOW);
    expect(international.map((item) => item.ressort)).toEqual(["sport", "wirtschaft", "inland"]);
  });

  it("uses the feed's section when the entry has none", () => {
    const parsed = parseRss(sample, feed({ category: "wissen" }), NOW);
    expect(
      parsed.find((item) => item.title === "Johannes Winkel als Vorsitzender wiedergewählt")
        ?.ressort,
    ).toBe("inland");
  });

  it("parses every bundled snapshot", () => {
    for (const [sourceId, xml] of Object.entries(fixtureFeeds)) {
      const parsed = parseRss(xml, feed({ sourceId: sourceId as RssFeed["sourceId"] }), NOW);
      expect(parsed.length, sourceId).toBeGreaterThan(4);
      expect(
        parsed.every((item) => item.title.length > 0 && item.shareUrl.startsWith("https://")),
      ).toBe(true);
    }
  });

  it("ignores documents that are not feeds", () => {
    expect(parseRss("<html><body>nope</body></html>", feed(), NOW)).toEqual([]);
  });
});

describe("fetchRssFeed", () => {
  it("sends validators and reports unchanged feeds", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 304 }));
    const result = await fetchRssFeed(fetchMock, feed(), {
      etag: '"abc"',
      lastModified: "Sat, 17 Oct 2026 08:00:00 GMT",
    });
    expect(result).toEqual({ status: "not-modified" });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("if-none-match")).toBe('"abc"');
    expect(headers.get("if-modified-since")).toBe("Sat, 17 Oct 2026 08:00:00 GMT");
  });

  it("returns items with the new validators", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(sample, { headers: { etag: '"v2"', "content-type": "application/rss+xml" } }),
    );
    const result = await fetchRssFeed(fetchMock, feed(), NO_VALIDATORS);
    expect(result.status === "ok" && result.validators).toEqual({
      etag: '"v2"',
      lastModified: null,
    });
    expect(result.status === "ok" ? result.items : []).toHaveLength(3);
  });

  it("surfaces HTTP errors", async () => {
    const fetchMock = vi.fn(async () => new Response("gone", { status: 410 }));
    await expect(fetchRssFeed(fetchMock, feed(), NO_VALIDATORS)).rejects.toThrow(/410/);
  });
});

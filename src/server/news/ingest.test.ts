import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Database } from "#/server/db/client.ts";
import { feedState, savedStory, story } from "#/server/db/schema.ts";
import { createTestDb, createUser } from "../../../test/db.ts";
import { backoffMs } from "./feed-state.ts";
import { allFeeds } from "./feeds.ts";
import { createFixtureSource } from "./fixture.ts";
import fixtureStories from "./fixture-stories.json" with { type: "json" };
import { ingestNews } from "./ingest.ts";
import { tagesschauFeed } from "./tagesschau.ts";
import type { FeedItem, FeedSpec, NewsSource } from "./types.ts";

const NOW = new Date("2026-10-16T12:00:00Z");
const tagesschau = allFeeds(["tagesschau"]);

function item(id: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    sourceId: "tagesschau",
    title: id,
    topline: null,
    firstSentence: null,
    body: null,
    detailsUrl: "x",
    shareUrl: `https://www.tagesschau.de/${id}`,
    ressort: "inland",
    regionId: null,
    breaking: false,
    publishedAt: NOW,
    ...overrides,
  };
}

describe("ingestNews", () => {
  let db: Database;
  beforeEach(async () => {
    db = await createTestDb();
  });

  it("stores every fixture story once, tagged with region where applicable", async () => {
    const result = await ingestNews({
      db,
      source: createFixtureSource(() => NOW),
      feeds: tagesschau,
      now: NOW,
    });
    expect(result).toMatchObject({ inserted: fixtureStories.length, failedFeeds: 0, feeds: 22 });

    const rows = await db.select().from(story);
    expect(rows).toHaveLength(fixtureStories.length);
    expect(rows.every((row) => row.sourceId === "tagesschau" && row.clusterId !== "")).toBe(true);
    expect(
      rows
        .filter((row) => row.regionId !== null)
        .map((row) => row.regionId)
        .sort(),
    ).toEqual([3, 9]);
    const states = await db.select().from(feedState);
    expect(states).toHaveLength(22);
    expect(states.every((state) => state.fetchedAt?.getTime() === NOW.getTime())).toBe(true);
  });

  it("is idempotent", async () => {
    const source = createFixtureSource(() => NOW);
    await ingestNews({ db, source, feeds: tagesschau, now: NOW });
    const second = await ingestNews({ db, source, feeds: tagesschau, now: NOW });
    expect(second.inserted).toBe(0);
  });

  it("groups reports of the same event from different outlets", async () => {
    const result = await ingestNews({
      db,
      source: createFixtureSource(() => NOW),
      feeds: allFeeds(["tagesschau", "spiegel", "zdf", "dlf"]),
      now: NOW,
    });
    expect(result.clustered).toBeGreaterThan(0);
    const tagesschauStory = await db.query.story.findFirst({
      where: eq(story.id, "c017f640-93c3-4690-9817-2ce50da21ad7"),
    });
    const winkel = await db
      .select({ sourceId: story.sourceId, clusterId: story.clusterId, ressort: story.ressort })
      .from(story)
      .where(eq(story.clusterId, tagesschauStory?.clusterId ?? ""));
    expect(winkel.map((row) => row.sourceId).sort()).toEqual(["spiegel", "tagesschau", "zdf"]);
    expect(winkel.every((row) => row.ressort === "inland")).toBe(true);
  });

  it("skips stories without a usable body and backs off from failing feeds", async () => {
    const source: NewsSource = {
      fetchFeed: async (feed) => {
        if (feed.kind === "tagesschau" && "regionId" in feed.query) {
          throw new Error("feed down");
        }
        const items =
          feed.key === "tagesschau:ressort:inland"
            ? [item("short"), item("teaser", { body: "Too short." })]
            : [];
        return { status: "ok", items, validators: { etag: '"1"', lastModified: null } };
      },
      fetchBody: async () => "too short",
    };
    const result = await ingestNews({ db, source, feeds: tagesschau, now: NOW });
    expect(result).toMatchObject({ inserted: 0, failedFeeds: 16 });

    const failed = await db.query.feedState.findFirst({
      where: eq(feedState.key, "tagesschau:region:1"),
    });
    expect(failed).toMatchObject({ failures: 1, fetchedAt: null });
    expect(failed?.retryAt?.getTime()).toBe(NOW.getTime() + backoffMs(1));

    // Feeds in backoff are not retried before their time.
    const again = await ingestNews({ db, source, feeds: tagesschau, now: NOW });
    expect(again.feeds).toBe(6);
  });

  it("sends validators back and counts unchanged feeds", async () => {
    const seen: (string | null)[] = [];
    const feed: FeedSpec = tagesschauFeed({ ressort: "inland" });
    const source: NewsSource = {
      fetchFeed: async (_feed, validators) => {
        seen.push(validators.etag);
        return validators.etag
          ? { status: "not-modified" }
          : { status: "ok", items: [], validators: { etag: '"v1"', lastModified: null } };
      },
      fetchBody: async () => "",
    };
    await ingestNews({ db, source, feeds: [feed], now: NOW });
    const second = await ingestNews({ db, source, feeds: [feed], now: NOW });
    expect(seen).toEqual([null, '"v1"']);
    expect(second).toMatchObject({ notModified: 1, failedFeeds: 0 });
  });

  it("prunes old stories but keeps the ones somebody saved", async () => {
    await createUser(db);
    const old = new Date(NOW.getTime() - 30 * 86_400_000);
    const base = {
      ressort: "inland",
      body: "x".repeat(300),
      shareUrl: "https://www.tagesschau.de/a",
      publishedAt: old,
    };
    await db.insert(story).values([
      { ...base, id: "old-unsaved", clusterId: "old-unsaved", title: "Old" },
      { ...base, id: "old-saved", clusterId: "old-saved", title: "Old but saved" },
    ]);
    await db.insert(savedStory).values({ userId: "user-1", storyId: "old-saved" });

    const result = await ingestNews({
      db,
      source: createFixtureSource(() => NOW),
      feeds: [],
      now: NOW,
    });
    expect(result.pruned).toBe(1);
    expect(await db.query.story.findFirst({ where: eq(story.id, "old-unsaved") })).toBeUndefined();
    expect(await db.query.story.findFirst({ where: eq(story.id, "old-saved") })).toBeDefined();
  });
});

describe("backoffMs", () => {
  it("doubles from five minutes up to six hours", () => {
    expect([1, 2, 3].map(backoffMs)).toEqual([300_000, 600_000, 1_200_000]);
    expect(backoffMs(20)).toBe(6 * 3_600_000);
  });
});

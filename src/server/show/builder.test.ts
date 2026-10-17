import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES, type NewsSegment, type TrackRef } from "#/lib/domain.ts";
import type { Database } from "#/server/db/client.ts";
import { clip, listen, story } from "#/server/db/schema.ts";
import { MusicProviderError } from "#/server/music/types.ts";
import { createFixtureSource } from "#/server/news/fixture.ts";
import { savePreferences } from "#/server/preferences.ts";
import { createTestDb, createUser } from "../../../test/db.ts";
import { makeTrack } from "../../../test/tracks.ts";
import { type BlockRequest, buildShowBlock, type ShowDependencies } from "./builder.ts";

const NOW = new Date("2026-10-16T12:00:00Z");
const library: TrackRef[] = ["a", "b", "c", "d", "e", "f"].map((id) => makeTrack(id));

function deps(
  db: Database,
  music: ShowDependencies["music"] = async () => ({ provider: "spotify", tracks: library }),
): ShowDependencies {
  return { db, newsSource: createFixtureSource(() => NOW), music, now: () => NOW };
}

const firstBlock = (userId: string): BlockRequest => ({
  userId,
  index: 0,
  previous: { kind: "nothing" },
  recentTrackIds: [],
});

describe("buildShowBlock", () => {
  let db: Database;
  let userId: string;

  beforeEach(async () => {
    db = await createTestDb();
    userId = await createUser(db);
    await savePreferences(db, userId, { ...DEFAULT_PREFERENCES, displayName: "Ada", balance: 50 });
  });

  it("renders intro → songs → bridge → news with playable audio", async () => {
    const block = await buildShowBlock(deps(db), firstBlock(userId));

    expect(block.index).toBe(0);
    expect(block.notices).toEqual([]);
    expect(block.segments.map((s) => (s.kind === "host" ? `host:${s.role}` : s.kind))).toEqual([
      "host:intro",
      "music",
      "music",
      "music",
      "host:bridge",
      "news",
      "news",
    ]);
    const [intro] = block.segments;
    expect(intro?.kind === "host" && intro.transcript).toMatch(/Good afternoon, Ada!/);
    for (const segment of block.segments) {
      if (segment.kind !== "music") {
        expect(segment.audioUrl).toMatch(/^\/api\/audio\/clips\/\d{4}-\d{2}-\d{2}\/[\w-]+\.wav$/);
      }
    }
  });

  it("records served stories and doesn't repeat them", async () => {
    const first = await buildShowBlock(deps(db), firstBlock(userId));
    const firstStories = first.segments.flatMap((s) => (s.kind === "news" ? [s.story.id] : []));
    expect(await db.select().from(listen).where(eq(listen.userId, userId))).toHaveLength(
      firstStories.length,
    );

    const second = await buildShowBlock(deps(db), {
      userId,
      index: 1,
      previous: { kind: "story", title: "Previous", topline: null },
      recentTrackIds: first.segments.flatMap((s) => (s.kind === "music" ? [s.track.id] : [])),
    });
    const secondStories = second.segments.flatMap((s) => (s.kind === "news" ? [s.story.id] : []));
    expect(secondStories.some((id) => firstStories.includes(id))).toBe(false);
    expect(second.segments[0]).toMatchObject({ kind: "host", role: "bridge" });
  });

  it("shares rendered news clips between listeners with the same settings", async () => {
    const other = await createUser(db, "user-2", "Grace Hopper");
    await savePreferences(db, other, { ...DEFAULT_PREFERENCES, displayName: "Grace", balance: 0 });
    await savePreferences(db, userId, { ...DEFAULT_PREFERENCES, displayName: "Ada", balance: 0 });

    const a = await buildShowBlock(deps(db), firstBlock(userId));
    const b = await buildShowBlock(deps(db), firstBlock(other));
    const newsIds = (block: typeof a) =>
      block.segments.flatMap((s) => (s.kind === "news" ? [s.id] : []));

    expect(newsIds(a).length).toBeGreaterThan(0);
    expect(newsIds(b)).toEqual(newsIds(a));
    const shared = await db.select().from(clip).where(eq(clip.kind, "news"));
    expect(shared.every((row) => row.userId === null && row.cacheKey !== null)).toBe(true);
    // Shared clips are not personalised.
    expect(shared.some((row) => row.transcript.includes("Ada"))).toBe(false);
  });

  it("only plays the outlets the listener picked", async () => {
    await savePreferences(db, userId, {
      ...DEFAULT_PREFERENCES,
      displayName: "Ada",
      balance: 0,
      newsSources: ["bbc", "guardian"],
    });
    const block = await buildShowBlock(deps(db), firstBlock(userId));
    const sources = block.segments.flatMap((s) => (s.kind === "news" ? [s.story.sourceId] : []));
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((source) => source === "bbc" || source === "guardian")).toBe(true);
  });

  it("plays every event once and credits the other outlets that covered it", async () => {
    await savePreferences(db, userId, {
      ...DEFAULT_PREFERENCES,
      displayName: "Ada",
      balance: 0,
      categories: [],
      newsSources: ["tagesschau", "spiegel", "zdf", "dlf"],
    });
    const news: NewsSegment[] = [];
    for (let index = 0; index < 6; index += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: each block depends on what was heard before
      const block = await buildShowBlock(deps(db), {
        userId,
        index,
        previous: { kind: "nothing" },
        recentTrackIds: [],
      });
      news.push(...block.segments.flatMap((s) => (s.kind === "news" ? [s] : [])));
    }
    const clusters = await db
      .select({ clusterId: story.clusterId })
      .from(listen)
      .innerJoin(story, eq(story.id, listen.storyId));
    expect(new Set(clusters.map((row) => row.clusterId)).size).toBe(clusters.length);

    const credited = news.find((segment) => segment.story.alsoReportedBy.length > 0);
    expect(credited?.transcript).toMatch(/reported it too\.$/);
    expect(credited?.story.alsoReportedBy).not.toContain(credited?.story.sourceId);
  });

  it("falls back to news only and explains why when Spotify fails", async () => {
    const failing = vi.fn(async () => {
      throw new MusicProviderError("quota", {
        provider: "spotify",
        code: "quota_exceeded",
        status: 429,
      });
    });
    const block = await buildShowBlock(deps(db, failing), firstBlock(userId));
    expect(block.segments.some((s) => s.kind === "music")).toBe(false);
    expect(block.notices).toEqual([expect.stringMatching(/quota/)]);
  });

  it("doesn't ask Spotify at all for news-only listeners", async () => {
    await savePreferences(db, userId, { ...DEFAULT_PREFERENCES, displayName: "Ada", balance: 0 });
    const music = vi.fn(async () => ({ provider: "spotify" as const, tracks: library }));
    const block = await buildShowBlock(deps(db, music), firstBlock(userId));
    expect(music).not.toHaveBeenCalled();
    expect(block.segments.filter((s) => s.kind === "news")).toHaveLength(3);
  });

  it("treats unlinked listeners as news-only", async () => {
    const block = await buildShowBlock(
      deps(db, async () => null),
      firstBlock(userId),
    );
    expect(block.segments.map((s) => s.kind)).toEqual(["host", "news", "news"]);
  });

  it("drops song names from incoming context when the listener opted out", async () => {
    await savePreferences(db, userId, {
      ...DEFAULT_PREFERENCES,
      displayName: "Ada",
      mentionTracks: false,
    });
    const block = await buildShowBlock(deps(db), {
      userId,
      index: 2,
      previous: { kind: "track", name: "Secret Song", artists: ["Secret Band"] },
      recentTrackIds: [],
    });
    const transcripts = block.segments.flatMap((s) => (s.kind === "music" ? [] : [s.transcript]));
    expect(transcripts.join(" ")).not.toMatch(/Secret|Track [a-f]/);
  });
});

describe("account deletion", () => {
  it("removes a listener's personal recordings from storage", async () => {
    const { readLocalObject } = await import("#/server/storage/local.ts");
    const { deleteUserClipFiles } = await import("#/server/clips.ts");
    const db = await createTestDb();
    const userId = await createUser(db);
    const block = await buildShowBlock(deps(db), firstBlock(userId));
    const [intro] = block.segments;
    if (intro?.kind !== "host") {
      throw new Error("expected a host intro");
    }
    const key = intro.audioUrl.replace("/api/audio/", "");
    const { env } = await import("#/server/env.ts");
    const dir = env.STORAGE_LOCAL_DIR;
    expect(await readLocalObject(dir, key)).not.toBeNull();

    await deleteUserClipFiles(db, userId);
    expect(await readLocalObject(dir, key)).toBeNull();
  });
});

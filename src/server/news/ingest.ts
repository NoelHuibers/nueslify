import { and, eq, gt, inArray, isNull, lt, notInArray } from "drizzle-orm";
import { chunk, mapWithConcurrency } from "#/lib/async.ts";
import type { Database } from "#/server/db/client.ts";
import { savedStory, story } from "#/server/db/schema.ts";
import { logger } from "#/server/logger.ts";
import { assignClusters, type ClusterSeed, storyKeywords } from "./cluster.ts";
import {
  type FeedOutcome,
  inBackoff,
  loadFeedStates,
  saveFeedOutcomes,
  validatorsOf,
} from "./feed-state.ts";
import { allFeeds } from "./feeds.ts";
import type { FeedItem, FeedSpec, NewsSource } from "./types.ts";

/** Full articles (tagesschau) must have some substance; RSS teasers are short by nature. */
const MIN_ARTICLE_LENGTH = 200;
const MIN_TEASER_LENGTH = 40;
const RETENTION_DAYS = 14;
/** Newest entries per feed; tagesschau's regional feeds go back weeks. */
const PER_FEED = 25;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Reports more than this far apart are treated as different events. */
export const CLUSTER_WINDOW_MS = 36 * HOUR;

export type IngestResult = {
  feeds: number;
  notModified: number;
  failedFeeds: number;
  seen: number;
  inserted: number;
  clustered: number;
  pruned: number;
};

type FetchedFeed = { feed: FeedSpec; items: FeedItem[] };

async function fetchFeeds(
  db: Database,
  source: NewsSource,
  feeds: readonly FeedSpec[],
  now: Date,
): Promise<{ fetched: FetchedFeed[]; outcomes: FeedOutcome[] }> {
  const states = await loadFeedStates(
    db,
    feeds.map((feed) => feed.key),
  );
  const due = feeds.filter((feed) => !inBackoff(states.get(feed.key), now));
  const results = await mapWithConcurrency(due, 8, async (feed) => {
    try {
      return { feed, result: await source.fetchFeed(feed, validatorsOf(states.get(feed.key))) };
    } catch (error) {
      logger.warn("news feed failed", { feed: feed.key, error: String(error) });
      return { feed, result: null };
    }
  });

  const outcomes: FeedOutcome[] = results.map(({ feed, result }) =>
    result
      ? { key: feed.key, ok: true, validators: result.status === "ok" ? result.validators : null }
      : { key: feed.key, ok: false },
  );
  await saveFeedOutcomes(db, outcomes, states, now);
  const fetched = results.flatMap(({ feed, result }) =>
    result?.status === "ok" ? [{ feed, items: result.items }] : [],
  );
  return { fetched, outcomes };
}

function uniqueItems(fetched: readonly FetchedFeed[], now: Date): FeedItem[] {
  const oldest = now.getTime() - RETENTION_DAYS * DAY;
  const unique = new Map<string, FeedItem>();
  for (const { items } of fetched) {
    const recent = items
      .filter((item) => item.publishedAt.getTime() > oldest)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, PER_FEED);
    for (const item of recent) {
      // Prefer the regional tagging if a story shows up in both a ressort and a region feed.
      const existing = unique.get(item.id);
      unique.set(
        item.id,
        existing ? { ...existing, regionId: existing.regionId ?? item.regionId } : item,
      );
    }
  }
  return [...unique.values()];
}

async function unknownItems(db: Database, items: readonly FeedItem[]): Promise<FeedItem[]> {
  const knownRows = await Promise.all(
    chunk(
      items.map((item) => item.id),
      500,
    ).map((ids) => db.select({ id: story.id }).from(story).where(inArray(story.id, ids))),
  );
  const known = new Set(knownRows.flat().map((row) => row.id));
  return items.filter((item) => !known.has(item.id));
}

async function withBodies(source: NewsSource, items: readonly FeedItem[]) {
  const bodies = await mapWithConcurrency(items, 10, async (item) => {
    try {
      return await source.fetchBody(item);
    } catch (error) {
      logger.warn("story details failed", { id: item.id, error: String(error) });
      return "";
    }
  });
  return items
    .map((item, index) => ({ item, body: bodies[index] ?? "" }))
    .filter(
      ({ item, body }) =>
        body.length >= (item.body === null ? MIN_ARTICLE_LENGTH : MIN_TEASER_LENGTH),
    );
}

/** The first story of every cluster from the last 36 hours. */
async function loadSeeds(db: Database, now: Date): Promise<ClusterSeed[]> {
  const rows = await db
    .select({
      clusterId: story.clusterId,
      title: story.title,
      topline: story.topline,
      firstSentence: story.firstSentence,
      ressort: story.ressort,
    })
    .from(story)
    .where(
      and(
        gt(story.publishedAt, new Date(now.getTime() - CLUSTER_WINDOW_MS)),
        eq(story.clusterId, story.id),
      ),
    );
  return rows.map((row) => ({
    clusterId: row.clusterId,
    ressort: row.ressort,
    keywords: storyKeywords(row),
  }));
}

async function pruneStories(db: Database, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * DAY);
  const pruned = await db
    .delete(story)
    .where(
      and(
        lt(story.publishedAt, cutoff),
        notInArray(story.id, db.select({ id: savedStory.storyId }).from(savedStory)),
      ),
    )
    .returning({ id: story.id });
  return pruned.length;
}

/**
 * Fetches feeds (conditionally, skipping feeds in backoff), stores new stories and assigns them
 * to clusters of reports about the same event.
 */
export async function ingestNews(options: {
  db: Database;
  source: NewsSource;
  feeds?: readonly FeedSpec[];
  prune?: boolean;
  now?: Date;
}): Promise<IngestResult> {
  const { db, source, feeds = allFeeds(), prune = true, now = new Date() } = options;
  const { fetched, outcomes } = await fetchFeeds(db, source, feeds, now);
  const candidates = uniqueItems(fetched, now);
  const fresh = await withBodies(source, await unknownItems(db, candidates));

  const seeds = await loadSeeds(db, now);
  const unsectioned = new Set(seeds.filter((seed) => seed.ressort === null));
  const clustered = assignClusters(
    fresh.map(({ item, body }) => ({ ...item, body })),
    seeds,
  );
  const rows = clustered.map((item) => ({
    id: item.id,
    sourceId: item.sourceId,
    clusterId: item.clusterId,
    ressort: item.ressort,
    regionId: item.regionId,
    title: item.title,
    topline: item.topline,
    firstSentence: item.firstSentence,
    body: item.body,
    shareUrl: item.shareUrl,
    breaking: item.breaking,
    publishedAt: item.publishedAt,
  }));
  await Promise.all(
    chunk(rows, 200).map((batch) => db.insert(story).values(batch).onConflictDoNothing()),
  );
  // Earlier reports of an event learn its section from the reports that just arrived.
  await Promise.all(
    [...unsectioned].flatMap((seed) =>
      seed.ressort === null
        ? []
        : [
            db
              .update(story)
              .set({ ressort: seed.ressort })
              .where(and(eq(story.clusterId, seed.clusterId), isNull(story.ressort))),
          ],
    ),
  );

  const result: IngestResult = {
    feeds: outcomes.length,
    notModified: outcomes.length - fetched.length - outcomes.filter((o) => !o.ok).length,
    failedFeeds: outcomes.filter((outcome) => !outcome.ok).length,
    seen: candidates.length,
    inserted: rows.length,
    clustered: rows.filter((row) => row.clusterId !== row.id).length,
    pruned: prune ? await pruneStories(db, now) : 0,
  };
  logger.info("news ingested", result);
  return result;
}

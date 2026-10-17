import { and, countDistinct, desc, eq, gt, inArray, notInArray, sql } from "drizzle-orm";
import { createRandom } from "#/lib/async.ts";
import {
  type MusicRange,
  regionName,
  type Segment,
  type ShowBlock,
  type TrackRef,
} from "#/lib/domain.ts";
import { segmentCounts } from "#/lib/mix.ts";
import type { GenreId, MusicProviderId, MusicSourceChoice } from "#/lib/music.ts";
import type { NewsSourceId } from "#/lib/news/sources.ts";
import type { ItemContext, ListenerContext } from "#/server/ai/prompts.ts";
import type { Database } from "#/server/db/client.ts";
import { listen, story } from "#/server/db/schema.ts";
import { logger } from "#/server/logger.ts";
import { describeMusicError, MusicProviderError } from "#/server/music/types.ts";
import { feedsFor } from "#/server/news/feeds.ts";
import { ensureFreshNews } from "#/server/news/freshness.ts";
import { CLUSTER_WINDOW_MS } from "#/server/news/ingest.ts";
import type { NewsSource } from "#/server/news/types.ts";
import { loadPreferences } from "#/server/preferences.ts";
import { loadStoryDetails, materialize } from "./materialize.ts";
import { pickStories, pickTracks, planBlock } from "./planner.ts";
import { type CandidateStory, rankStories } from "./ranking.ts";

const HOUR = 3_600_000;
const STORY_MAX_AGE_MS = 36 * HOUR;
const NO_REPEAT_WINDOW_MS = 72 * HOUR;

export type ShowDependencies = {
  db: Database;
  newsSource: NewsSource;
  /** The listener's songs from whichever music source applies (see server/music/registry.ts). */
  music: (
    request: MusicRequest,
  ) => Promise<{ provider: MusicProviderId; tracks: TrackRef[] } | null>;
  now?: () => Date;
};

export type MusicRequest = {
  userId: string;
  choice: MusicSourceChoice;
  range: MusicRange;
  genres: readonly GenreId[];
};

export type BlockRequest = {
  userId: string;
  index: number;
  previous: ItemContext;
  recentTrackIds: readonly string[];
};

export class EmptyShowError extends Error {
  constructor() {
    super("Nothing to play right now. Try again in a few minutes.");
    this.name = "EmptyShowError";
  }
}

/** Plans and renders the next block of a listener's show. */
export async function buildShowBlock(
  deps: ShowDependencies,
  request: BlockRequest,
): Promise<ShowBlock> {
  const { db } = deps;
  const now = deps.now?.() ?? new Date();
  const prefs = await loadPreferences(db, request.userId);
  const notices: string[] = [];

  await ensureFreshNews({ db, source: deps.newsSource, now, feeds: feedsFor(prefs) });

  const [library, candidates] = await Promise.all([
    prefs.balance === 0
      ? null
      : loadLibrary(
          deps,
          {
            userId: request.userId,
            choice: prefs.musicSource,
            range: prefs.musicRange,
            genres: prefs.genres,
          },
          notices,
        ),
    loadRankedStories(db, request.userId, prefs.newsSources, now),
  ]);

  const counts = segmentCounts(prefs.balance, (library?.length ?? 0) > 0);
  const random = createRandom(now.getTime() + request.index);
  const tracks = pickTracks(library ?? [], new Set(request.recentTrackIds), counts.tracks, random);
  const stories = pickStories(candidates, prefs, counts.stories, request.index);

  // Respect "don't mention songs" even for context the client sends back to us.
  const previous: ItemContext =
    !prefs.mentionTracks && request.previous.kind === "track"
      ? { kind: "music", count: 1 }
      : request.previous;
  const plan = planBlock({
    index: request.index,
    tracks,
    stories,
    previous,
    mentionTracks: prefs.mentionTracks,
  });
  if (plan.length === 0) {
    throw new EmptyShowError();
  }

  const listener: ListenerContext = {
    name: prefs.displayName || "friend",
    language: prefs.language,
    hostStyle: prefs.hostStyle,
    regionName: regionName(prefs.regionId),
    now,
  };
  const details = await loadStoryDetails(db, stories);
  const ctx = { db, userId: request.userId, prefs, listener, details };
  const settled = await Promise.allSettled(plan.map((planned) => materialize(planned, ctx)));

  const segments: Segment[] = [];
  settled.forEach((result, position) => {
    if (result.status === "fulfilled") {
      segments.push(result.value);
      return;
    }
    logger.error("segment generation failed", {
      kind: plan[position]?.kind,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
  });
  const failures = settled.length - segments.length;
  if (failures > 0) {
    notices.push(
      failures === 1
        ? "One segment couldn't be generated and was skipped."
        : `${failures} segments couldn't be generated and were skipped.`,
    );
  }
  if (!segments.some((segment) => segment.kind !== "host")) {
    throw new EmptyShowError();
  }
  return { index: request.index, segments, notices };
}

async function loadLibrary(
  deps: ShowDependencies,
  request: MusicRequest,
  notices: string[],
): Promise<TrackRef[] | null> {
  try {
    return (await deps.music(request))?.tracks ?? null;
  } catch (error) {
    if (error instanceof MusicProviderError) {
      notices.push(describeMusicError(error));
      logger.warn("music source unavailable", {
        provider: error.provider,
        code: error.code,
        status: error.status,
      });
      return null;
    }
    throw error;
  }
}

/** Stories from the listener's outlets about events they haven't heard yet, ranked. */
async function loadRankedStories(
  db: Database,
  userId: string,
  sources: readonly NewsSourceId[],
  now: Date,
) {
  const since = new Date(now.getTime() - STORY_MAX_AGE_MS);
  // Hearing one outlet's report of an event counts for every outlet's report of it.
  const heardClusters = db
    .select({ id: story.clusterId })
    .from(listen)
    .innerJoin(story, eq(story.id, listen.storyId))
    .where(
      and(
        eq(listen.userId, userId),
        gt(listen.servedAt, new Date(now.getTime() - NO_REPEAT_WINDOW_MS)),
      ),
    );

  const [candidates, coverage] = await Promise.all([
    db
      .select({
        id: story.id,
        sourceId: story.sourceId,
        clusterId: story.clusterId,
        ressort: story.ressort,
        regionId: story.regionId,
        title: story.title,
        topline: story.topline,
        breaking: story.breaking,
        publishedAt: story.publishedAt,
        bodyLength: sql<number>`length(${story.body})`,
      })
      .from(story)
      .where(
        and(
          gt(story.publishedAt, since),
          inArray(story.sourceId, [...sources]),
          notInArray(story.clusterId, heardClusters),
        ),
      )
      .orderBy(desc(story.publishedAt))
      .limit(600),
    // How many outlets (of all ingested ones, not just the listener's) covered each event.
    db
      .select({ clusterId: story.clusterId, outlets: countDistinct(story.sourceId) })
      .from(story)
      .where(gt(story.publishedAt, new Date(now.getTime() - CLUSTER_WINDOW_MS)))
      .groupBy(story.clusterId)
      .having(sql`count(distinct ${story.sourceId}) > 1`),
  ]);
  return rankStories(
    candidates satisfies CandidateStory[],
    new Map(coverage.map((row) => [row.clusterId, row.outlets])),
    now,
  );
}

import type { Database } from "#/server/db/client.ts";
import { logger } from "#/server/logger.ts";
import { inBackoff, loadFeedStates } from "./feed-state.ts";
import { type IngestResult, ingestNews } from "./ingest.ts";
import type { FeedSpec, NewsSource } from "./types.ts";

const inFlight = new Map<string, Promise<IngestResult | null>>();

/** Ingests the feeds, sharing work with any refresh of the same feeds already under way. */
function refresh(
  options: { db: Database; source: NewsSource; now: Date },
  feeds: readonly FeedSpec[],
): Promise<unknown> {
  const pending = feeds.flatMap((feed) => {
    const running = inFlight.get(feed.key);
    return running ? [running] : [];
  });
  const missing = feeds.filter((feed) => !inFlight.has(feed.key));
  if (missing.length > 0) {
    const run = ingestNews({ ...options, feeds: missing, prune: false })
      .catch((error: unknown) => {
        logger.error("news refresh failed", { error: String(error) });
        return null;
      })
      .finally(() => {
        for (const feed of missing) {
          inFlight.delete(feed.key);
        }
      });
    for (const feed of missing) {
      inFlight.set(feed.key, run);
    }
    pending.push(run);
  }
  return Promise.all(pending);
}

/**
 * Keeps a listener's feeds fresh without waiting on the network when possible (the cron job
 * only keeps things warm). Freshness is tracked per feed:
 * - fresh: nothing to do
 * - stale: serve what we have, refresh in the background (stale-while-revalidate)
 * - never fetched: fetch it now, so a newly picked outlet shows up in the very next block
 * Feeds in backoff after repeated failures are left alone until their retry time.
 */
export async function ensureFreshNews(options: {
  db: Database;
  source: NewsSource;
  feeds: readonly FeedSpec[];
  maxAgeMs?: number;
  now?: Date;
}): Promise<void> {
  const { db, source, feeds, maxAgeMs = 20 * 60_000, now = new Date() } = options;
  const states = await loadFeedStates(
    db,
    feeds.map((feed) => feed.key),
  );
  const cold: FeedSpec[] = [];
  const stale: FeedSpec[] = [];
  for (const feed of feeds) {
    const state = states.get(feed.key);
    if (inBackoff(state, now)) {
      // Leave failing feeds alone until their retry time.
    } else if (!state?.fetchedAt) {
      cold.push(feed);
    } else if (now.getTime() - state.fetchedAt.getTime() >= maxAgeMs) {
      stale.push(feed);
    }
  }
  if (stale.length > 0) {
    void refresh({ db, source, now }, stale);
  }
  if (cold.length > 0) {
    await refresh({ db, source, now }, cold);
  }
}

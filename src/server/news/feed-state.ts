import { inArray, type SQL, sql } from "drizzle-orm";
import { chunk } from "#/lib/async.ts";
import type { Database } from "#/server/db/client.ts";
import { feedState } from "#/server/db/schema.ts";
import { NO_VALIDATORS, type Validators } from "./types.ts";

export type FeedState = typeof feedState.$inferSelect;

const MINUTE = 60_000;
const MAX_BACKOFF_MS = 6 * 60 * MINUTE;

export async function loadFeedStates(
  db: Database,
  keys: readonly string[],
): Promise<Map<string, FeedState>> {
  const rows = await Promise.all(
    chunk([...keys], 500).map((batch) =>
      db.select().from(feedState).where(inArray(feedState.key, batch)),
    ),
  );
  return new Map(rows.flat().map((row) => [row.key, row]));
}

export function validatorsOf(state: FeedState | undefined): Validators {
  return state ? { etag: state.etag, lastModified: state.lastModified } : NO_VALIDATORS;
}

export function inBackoff(state: FeedState | undefined, now: Date): boolean {
  return state?.retryAt ? state.retryAt.getTime() > now.getTime() : false;
}

/** 5 min, 10 min, 20 min, … capped at 6 hours. */
export function backoffMs(failures: number): number {
  return Math.min(MAX_BACKOFF_MS, 5 * MINUTE * 2 ** Math.max(0, failures - 1));
}

export type FeedOutcome =
  | { key: string; ok: true; validators: Validators | null }
  | { key: string; ok: false };

/** The value an upsert tried to insert (SQLite's `excluded` pseudo-table). */
function sqlExcluded(column: string): SQL {
  return sql.raw(`excluded.${column}`);
}

export async function saveFeedOutcomes(
  db: Database,
  outcomes: readonly FeedOutcome[],
  previous: ReadonlyMap<string, FeedState>,
  now: Date,
): Promise<void> {
  const rows = outcomes.map((outcome) => {
    const before = previous.get(outcome.key);
    if (outcome.ok) {
      const validators = outcome.validators ?? validatorsOf(before);
      return { key: outcome.key, ...validators, fetchedAt: now, failures: 0, retryAt: null };
    }
    const failures = (before?.failures ?? 0) + 1;
    return {
      key: outcome.key,
      etag: before?.etag ?? null,
      lastModified: before?.lastModified ?? null,
      fetchedAt: before?.fetchedAt ?? null,
      failures,
      retryAt: new Date(now.getTime() + backoffMs(failures)),
    };
  });
  const writes = chunk(rows, 100).map((batch) =>
    db
      .insert(feedState)
      .values(batch)
      .onConflictDoUpdate({
        target: feedState.key,
        set: {
          etag: sqlExcluded("etag"),
          lastModified: sqlExcluded("last_modified"),
          fetchedAt: sqlExcluded("fetched_at"),
          failures: sqlExcluded("failures"),
          retryAt: sqlExcluded("retry_at"),
          updatedAt: now,
        },
      }),
  );
  await Promise.all(writes);
}

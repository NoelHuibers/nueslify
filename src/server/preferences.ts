import { eq } from "drizzle-orm";
import { DEFAULT_PREFERENCES, type Preferences } from "#/lib/domain.ts";
import { DEFAULT_NEWS_SOURCES, isNewsSourceId } from "#/lib/news/sources.ts";
import type { Database } from "#/server/db/client.ts";
import { preferences, user } from "#/server/db/schema.ts";

const WHITESPACE = /\s+/;

export type StoredPreferences = Preferences & { onboarded: boolean };

/** Loads a listener's preferences, creating the defaults on first access. */
export async function loadPreferences(db: Database, userId: string): Promise<StoredPreferences> {
  let row = await db.query.preferences.findFirst({ where: eq(preferences.userId, userId) });
  if (!row) {
    const owner = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { name: true },
    });
    const firstName = owner?.name.trim().split(WHITESPACE)[0] ?? "";
    [row] = await db
      .insert(preferences)
      .values({ ...DEFAULT_PREFERENCES, userId, displayName: firstName.slice(0, 40) })
      .onConflictDoNothing()
      .returning();
    row ??= await db.query.preferences.findFirst({ where: eq(preferences.userId, userId) });
    if (!row) {
      throw new Error(`Could not create preferences for ${userId}`);
    }
  }
  return {
    displayName: row.displayName,
    language: row.language,
    hostStyle: row.hostStyle,
    voice: row.voice,
    aiProvider: row.aiProvider,
    musicRange: row.musicRange,
    balance: row.balance,
    categories: row.categories,
    regionId: row.regionId,
    mentionTracks: row.mentionTracks,
    musicSource: row.musicSource,
    genres: row.genres,
    // Outlets can be retired from the catalogue; never leave a listener without news.
    newsSources:
      row.newsSources.filter(isNewsSourceId).length > 0
        ? row.newsSources.filter(isNewsSourceId)
        : DEFAULT_NEWS_SOURCES,
    onboarded: row.onboardedAt !== null,
  };
}

export async function savePreferences(
  db: Database,
  userId: string,
  values: Preferences,
): Promise<void> {
  const now = new Date();
  await db
    .insert(preferences)
    .values({ ...values, userId, onboardedAt: now })
    .onConflictDoUpdate({
      target: preferences.userId,
      set: { ...values, onboardedAt: now, updatedAt: now },
    });
}

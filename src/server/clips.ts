import { and, eq, isNotNull, lt } from "drizzle-orm";
import type { Database } from "#/server/db/client.ts";
import { type ClipKind, clip } from "#/server/db/schema.ts";
import { logger } from "#/server/logger.ts";
import { storage } from "#/server/storage/index.ts";
import type { SynthesizedAudio } from "./ai/host.ts";

export type StoredClip = { id: string; url: string; transcript: string };

export async function storeClip(
  db: Database,
  input: {
    kind: ClipKind;
    transcript: string;
    audio: SynthesizedAudio;
    userId: string | null;
    storyId?: string;
    cacheKey?: string;
  },
): Promise<StoredClip> {
  const id = crypto.randomUUID();
  const day = new Date().toISOString().slice(0, 10);
  const key = `clips/${day}/${id}.${input.audio.extension}`;
  const stored = await storage().put(key, input.audio.audio, input.audio.mimeType);

  const [row] = await db
    .insert(clip)
    .values({
      id,
      kind: input.kind,
      cacheKey: input.cacheKey ?? null,
      userId: input.userId,
      storyId: input.storyId ?? null,
      transcript: input.transcript,
      storageKey: stored.key,
      url: stored.url,
      mimeType: input.audio.mimeType,
    })
    .onConflictDoNothing()
    .returning({ id: clip.id, url: clip.url, transcript: clip.transcript });

  if (row) {
    return row;
  }
  // Another request rendered the same shared clip concurrently; keep theirs, drop ours.
  await storage().delete([stored.key]);
  const existing = input.cacheKey ? await findCachedClip(db, input.cacheKey) : undefined;
  if (!existing) {
    throw new Error("Clip insert conflicted but no cached clip was found");
  }
  return existing;
}

export function findCachedClip(db: Database, cacheKey: string): Promise<StoredClip | undefined> {
  return db.query.clip.findFirst({
    where: eq(clip.cacheKey, cacheKey),
    columns: { id: true, url: true, transcript: true },
  });
}

/** Deletes personal clips after `personalDays` and shared news clips after `sharedDays`. */
export async function pruneClips(
  db: Database,
  options: { now?: Date; personalDays?: number; sharedDays?: number } = {},
): Promise<number> {
  const { now = new Date(), personalDays = 2, sharedDays = 7 } = options;
  const day = 86_400_000;
  const personalCutoff = new Date(now.getTime() - personalDays * day);
  const sharedCutoff = new Date(now.getTime() - sharedDays * day);

  const removed = [
    ...(await db
      .delete(clip)
      .where(and(isNotNull(clip.userId), lt(clip.createdAt, personalCutoff)))
      .returning({ key: clip.storageKey })),
    ...(await db
      .delete(clip)
      .where(and(isNotNull(clip.cacheKey), lt(clip.createdAt, sharedCutoff)))
      .returning({ key: clip.storageKey })),
  ];
  if (removed.length > 0) {
    await storage().delete(removed.map((row) => row.key));
  }
  logger.info("clips pruned", { count: removed.length });
  return removed.length;
}

/** Removes a listener's personal recordings from storage (rows go via ON DELETE CASCADE). */
export async function deleteUserClipFiles(db: Database, userId: string): Promise<void> {
  const rows = await db.select({ key: clip.storageKey }).from(clip).where(eq(clip.userId, userId));
  if (rows.length > 0) {
    await storage().delete(rows.map((row) => row.key));
  }
}

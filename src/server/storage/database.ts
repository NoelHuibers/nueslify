import { eq, inArray } from "drizzle-orm";
import type { Database } from "#/server/db/client.ts";
import { audioObject } from "#/server/db/schema.ts";
import type { ObjectStorage } from "./index.ts";

/** Stores audio in the database itself and serves it from `publicPath` (see /api/audio). */
export function createDatabaseStorage(db: Database, publicPath: string): ObjectStorage {
  return {
    async put(key, body, contentType) {
      await db
        .insert(audioObject)
        .values({ key, contentType, data: Buffer.from(body) })
        .onConflictDoUpdate({
          target: audioObject.key,
          set: { contentType, data: Buffer.from(body) },
        });
      return { key, url: `${publicPath}/${key}` };
    },
    async delete(keys) {
      if (keys.length > 0) {
        await db.delete(audioObject).where(inArray(audioObject.key, [...keys]));
      }
    },
  };
}

export async function readDatabaseObject(
  db: Database,
  key: string,
): Promise<{ data: Uint8Array<ArrayBuffer>; size: number } | null> {
  const row = await db.query.audioObject.findFirst({ where: eq(audioObject.key, key) });
  if (!row) {
    return null;
  }
  const data = new Uint8Array(row.data);
  return { data, size: data.byteLength };
}

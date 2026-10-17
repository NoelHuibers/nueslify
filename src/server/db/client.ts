import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "#/server/env.ts";
// biome-ignore lint/performance/noNamespaceImport: Drizzle's relational query API needs the whole schema module
import * as schema from "./schema.ts";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(url: string, authToken?: string) {
  if (url.startsWith("file:") && !url.includes(":memory:")) {
    mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
  }
  const client = createClient(authToken ? { url, authToken } : { url });
  // SQLite ships with foreign keys off; cascades (account deletion etc.) depend on them.
  void client.execute("PRAGMA foreign_keys = ON");
  if (url.startsWith("file:")) {
    void client.execute("PRAGMA journal_mode = WAL");
  }
  return drizzle(client, { schema, casing: "snake_case" });
}

const globalForDb = globalThis as unknown as { nueslifyDb?: Database };

/** Shared connection; reused across dev-server HMR reloads. */
export const db: Database =
  globalForDb.nueslifyDb ?? createDatabase(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);

if (env.NODE_ENV !== "production") {
  globalForDb.nueslifyDb = db;
}

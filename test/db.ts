import { migrate } from "drizzle-orm/libsql/migrator";
import { createDatabase, type Database } from "#/server/db/client.ts";
import { user } from "#/server/db/schema.ts";

/** A fresh, fully migrated in-memory database. */
export async function createTestDb(): Promise<Database> {
  const db = createDatabase(":memory:");
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

export async function createUser(
  db: Database,
  id = "user-1",
  name = "Ada Lovelace",
): Promise<string> {
  await db.insert(user).values({ id, name, email: `${id}@example.com` });
  return id;
}

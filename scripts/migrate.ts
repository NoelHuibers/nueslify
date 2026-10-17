/**
 * Applies pending migrations from ./drizzle to DATABASE_URL (local file or Turso).
 * Usage: pnpm db:migrate
 */
import process from "node:process";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDatabase } from "../src/server/db/client.ts";
import { env } from "../src/server/env.ts";

const db = createDatabase(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);
await migrate(db, { migrationsFolder: "drizzle" });
db.$client.close();
process.stdout.write(`Migrations applied to ${env.DATABASE_URL.replace(/\/\/.*@/, "//***@")}\n`);

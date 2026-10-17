import process from "node:process";
import { defineConfig } from "drizzle-kit";

const url = process.env["DATABASE_URL"] ?? "file:.data/dev.db";
const authToken = process.env["DATABASE_AUTH_TOKEN"];

export default defineConfig({
  out: "./drizzle",
  schema: "./src/server/db/schema.ts",
  dialect: "turso",
  dbCredentials: authToken ? { url, authToken } : { url },
  casing: "snake_case",
});

import process from "node:process";
import { defineConfig, devices } from "@playwright/test";
import { CRON_SECRET } from "./e2e/helpers.ts";

const PORT = 3311;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * End-to-end tests run against a production build with offline fixtures:
 * bundled tagesschau stories, the mock AI host (silent audio) and a fresh SQLite database.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: {
    command:
      "rm -f .data/e2e.db* && node scripts/migrate.ts && pnpm build && node .output/server/index.mjs",
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NODE_ENV: "production",
      PORT: String(PORT),
      HOST: "127.0.0.1",
      DATABASE_URL: "file:.data/e2e.db",
      BETTER_AUTH_URL: BASE_URL,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e",
      CRON_SECRET,
      AI_MOCK: "true",
      // Many sign-ups within seconds would trip the (production) auth rate limiter.
      DISABLE_RATE_LIMIT: "true",
      NEWS_SOURCE: "fixture",
      // Free catalogue replaced by bundled demo tones, so music plays offline.
      MUSIC_CATALOG: "fixture",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: ".data/e2e-audio",
    },
  },
});

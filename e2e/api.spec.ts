import { expect, test } from "@playwright/test";
import { CRON_SECRET } from "./helpers.ts";

test("health check", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({
    ok: true,
    database: "file",
    storage: "local",
    ai: "demo",
    cron: true,
  });
});

test("cron endpoint requires the secret", async ({ request }) => {
  expect((await request.get("/api/cron/news")).status()).toBe(401);
  expect(
    (await request.get("/api/cron/news", { headers: { authorization: "Bearer wrong" } })).status(),
  ).toBe(401);

  const response = await request.get("/api/cron/news", {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, news: { failedFeeds: 0 } });
});

test("audio route rejects path traversal and unknown files", async ({ request }) => {
  expect((await request.get("/api/audio/..%2F..%2Fpackage.json")).status()).toBe(404);
  expect((await request.get("/api/audio/clips/nope.wav")).status()).toBe(404);
});

test("server functions reject cross-site calls", async ({ request }) => {
  const response = await request.post("/_serverFn/anything", {
    headers: { "sec-fetch-site": "cross-site", origin: "https://evil.example" },
    data: {},
  });
  expect(response.status()).toBe(403);
});

test("manifest and service worker are served", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect(await manifest.json()).toMatchObject({ short_name: "Nueslify", start_url: "/listen" });
  expect((await request.get("/sw.js")).ok()).toBe(true);
});

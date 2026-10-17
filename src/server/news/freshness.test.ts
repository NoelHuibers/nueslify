import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "../../../test/db.ts";
import { allFeeds } from "./feeds.ts";
import { createFixtureSource } from "./fixture.ts";
import { ensureFreshNews } from "./freshness.ts";
import type { NewsSource } from "./types.ts";

const NOW = new Date("2026-10-16T12:00:00Z");
const MINUTE = 60_000;

function countingSource() {
  const fixture = createFixtureSource(() => NOW);
  const fetched: string[] = [];
  const source: NewsSource = {
    fetchFeed: (feed, validators) => {
      fetched.push(feed.key);
      return fixture.fetchFeed(feed, validators);
    },
    fetchBody: fixture.fetchBody,
  };
  return { source, fetched };
}

describe("ensureFreshNews", () => {
  it("fetches new feeds right away, then only stale ones, in the background", async () => {
    const db = await createTestDb();
    const { source, fetched } = countingSource();
    const feeds = allFeeds(["spiegel"]);

    await ensureFreshNews({ db, source, feeds, now: NOW });
    expect(fetched).toEqual(["spiegel:0"]);

    await ensureFreshNews({ db, source, feeds, now: new Date(NOW.getTime() + 10 * MINUTE) });
    expect(fetched).toHaveLength(1);

    await ensureFreshNews({ db, source, feeds, now: new Date(NOW.getTime() + 30 * MINUTE) });
    await vi.waitFor(() => expect(fetched).toHaveLength(2));
  });

  it("adds a newly picked outlet without refetching fresh ones", async () => {
    const db = await createTestDb();
    const { source, fetched } = countingSource();
    await ensureFreshNews({ db, source, feeds: allFeeds(["spiegel"]), now: NOW });
    await ensureFreshNews({ db, source, feeds: allFeeds(["spiegel", "bbc"]), now: NOW });
    expect(fetched).toEqual(["spiegel:0", "bbc:0"]);
  });

  it("shares one fetch between concurrent requests for the same feed", async () => {
    const db = await createTestDb();
    const { source, fetched } = countingSource();
    const feeds = allFeeds(["dlf"]);
    await Promise.all([
      ensureFreshNews({ db, source, feeds, now: NOW }),
      ensureFreshNews({ db, source, feeds, now: NOW }),
    ]);
    expect(fetched).toEqual(["dlf:0"]);
  });
});

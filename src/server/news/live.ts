import { fetchRssFeed } from "./rss.ts";
import { fetchTagesschauBody, fetchTagesschauFeed } from "./tagesschau.ts";
import type { NewsSource } from "./types.ts";

/** Fetches tagesschau's JSON API and every other outlet's RSS feed. */
export function createLiveSource(fetchImpl: typeof fetch = fetch): NewsSource {
  return {
    fetchFeed: (feed, validators) =>
      feed.kind === "tagesschau"
        ? fetchTagesschauFeed(fetchImpl, feed, validators)
        : fetchRssFeed(fetchImpl, feed, validators),
    fetchBody: (item) =>
      item.body === null ? fetchTagesschauBody(fetchImpl, item) : Promise.resolve(item.body),
  };
}

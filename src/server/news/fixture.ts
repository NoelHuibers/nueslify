import fixtureFeeds from "./fixture-feeds.json" with { type: "json" };
import fixtureStories from "./fixture-stories.json" with { type: "json" };
import { parseRss } from "./rss.ts";
import type { FeedItem, NewsSource } from "./types.ts";

type FixtureStory = (typeof fixtureStories)[number];

const MINUTE = 60_000;
const RSS_FIXTURES: Record<string, string> = fixtureFeeds;

/**
 * Offline news source: a snapshot of real tagesschau stories plus RSS snapshots of a few outlets
 * (several covering the same events, so clustering has something to do). Publish dates are
 * re-stamped relative to "now" so the stories always look fresh.
 */
export function createFixtureSource(now: () => Date = () => new Date()): NewsSource {
  const byId = new Map<string, FixtureStory>(fixtureStories.map((story) => [story.id, story]));
  const ago = (index: number) => new Date(now().getTime() - (index + 1) * 15 * MINUTE);

  return {
    fetchFeed(feed) {
      if (feed.kind === "rss") {
        const xml = RSS_FIXTURES[feed.sourceId];
        const items = xml && feed.key.endsWith(":0") ? parseRss(xml, feed, now()) : [];
        return Promise.resolve({
          status: "ok",
          items: items.map((item, index) => ({ ...item, publishedAt: ago(index) })),
          validators: { etag: null, lastModified: null },
        });
      }
      const { query } = feed;
      const items = fixtureStories.flatMap((story, index): FeedItem[] => {
        const matches =
          "ressort" in query ? story.ressort === query.ressort : story.regionId === query.regionId;
        if (!matches) {
          return [];
        }
        return [
          {
            id: story.id,
            sourceId: "tagesschau",
            title: story.title,
            topline: story.topline,
            firstSentence: story.firstSentence,
            body: null,
            detailsUrl: `fixture:${story.id}`,
            shareUrl: story.shareUrl,
            ressort: story.ressort,
            regionId: story.regionId,
            breaking: story.breaking,
            publishedAt: ago(index),
          },
        ];
      });
      return Promise.resolve({
        status: "ok",
        items,
        validators: { etag: null, lastModified: null },
      });
    },
    fetchBody(item) {
      return Promise.resolve(item.body ?? byId.get(item.id)?.body ?? "");
    },
  };
}

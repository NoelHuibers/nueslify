import type { CategoryId } from "#/lib/domain.ts";
import { NEWS_SOURCE_IDS, type NewsSourceId } from "#/lib/news/sources.ts";
import { ALL_TAGESSCHAU_FEEDS, tagesschauFeed } from "./tagesschau.ts";
import type { FeedSpec } from "./types.ts";

type RssSourceId = Exclude<NewsSourceId, "tagesschau">;

/** Public RSS feeds, checked October 2026. Section feeds carry their category. */
const RSS_FEEDS: Record<RssSourceId, readonly (string | [string, CategoryId])[]> = {
  zdf: ["https://www.zdf.de/rss/zdf/nachrichten"],
  dlf: ["https://www.deutschlandfunk.de/nachrichten-100.rss"],
  dw: ["https://rss.dw.com/xml/rss-de-all"],
  spiegel: ["https://www.spiegel.de/schlagzeilen/index.rss"],
  zeit: ["https://newsfeed.zeit.de/index"],
  sz: ["https://rss.sueddeutsche.de/rss/Topthemen"],
  taz: ["https://taz.de/!p4608;rss/"],
  faz: ["https://www.faz.net/rss/aktuell/"],
  welt: ["https://www.welt.de/feeds/latest.rss"],
  handelsblatt: [["https://www.handelsblatt.com/contentexport/feed/schlagzeilen", "wirtschaft"]],
  ntv: ["https://www.n-tv.de/rss"],
  focus: ["https://www.focus.de/rss"],
  bbc: ["https://feeds.bbci.co.uk/news/world/rss.xml"],
  guardian: ["https://www.theguardian.com/world/rss"],
  telegraph: ["https://www.telegraph.co.uk/rss.xml"],
  nyt: ["https://rss.nytimes.com/services/xml/rss/nyt/World.xml"],
  npr: ["https://feeds.npr.org/1001/rss.xml"],
  france24: ["https://www.france24.com/en/rss"],
  euronews: ["https://www.euronews.com/rss"],
  "politico-eu": ["https://www.politico.eu/feed/"],
  nzz: ["https://www.nzz.ch/recent.rss", ["https://www.nzz.ch/international.rss", "ausland"]],
  aljazeera: ["https://www.aljazeera.com/xml/rss/all.xml"],
};

function rssFeeds(sourceId: RssSourceId): FeedSpec[] {
  return RSS_FEEDS[sourceId].map((entry, index) => {
    const [url, category] = typeof entry === "string" ? [entry, null] : entry;
    return { kind: "rss", key: `${sourceId}:${index}`, sourceId, url, category };
  });
}

/**
 * The feeds behind a listener's show. tagesschau is queried per section and Bundesland, so only
 * the listener's sections and region are fetched; RSS outlets have one or two feeds each.
 */
export function feedsFor(prefs: {
  newsSources: readonly NewsSourceId[];
  categories: readonly CategoryId[];
  regionId: number | null;
}): FeedSpec[] {
  return prefs.newsSources.flatMap((sourceId): FeedSpec[] => {
    if (sourceId !== "tagesschau") {
      return rssFeeds(sourceId);
    }
    const ressorts = prefs.categories.length > 0 ? prefs.categories : null;
    const sections = ressorts
      ? ressorts.map((ressort) => tagesschauFeed({ ressort }))
      : ALL_TAGESSCHAU_FEEDS.filter((feed) => "ressort" in feed.query);
    return prefs.regionId === null
      ? sections
      : [...sections, tagesschauFeed({ regionId: prefs.regionId })];
  });
}

/** Every feed of the given outlets (the cron job refreshes all outlets anyone listens to). */
export function allFeeds(sources: readonly NewsSourceId[] = NEWS_SOURCE_IDS): FeedSpec[] {
  return [...new Set(sources)].flatMap((sourceId) =>
    sourceId === "tagesschau" ? ALL_TAGESSCHAU_FEEDS : rssFeeds(sourceId),
  );
}

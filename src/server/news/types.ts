import type { CategoryId } from "#/lib/domain.ts";
import type { NewsSourceId } from "#/lib/news/sources.ts";

/** tagesschau's API is queried per ressort or per Bundesland. */
export type FeedQuery = { ressort: string } | { regionId: number };

/** One feed of one outlet. `key` identifies it in `feed_state`. */
export type FeedSpec =
  | { kind: "tagesschau"; key: string; sourceId: "tagesschau"; query: FeedQuery }
  | {
      kind: "rss";
      key: string;
      sourceId: NewsSourceId;
      url: string;
      /** Section the whole feed belongs to, if it is a section feed. */
      category: CategoryId | null;
    };

export type FeedItem = {
  id: string;
  sourceId: NewsSourceId;
  title: string;
  topline: string | null;
  /** Teaser or first sentence. */
  firstSentence: string | null;
  /** Article text when the feed carries it; `null` means "fetch it with `fetchBody`". */
  body: string | null;
  detailsUrl: string | null;
  shareUrl: string;
  ressort: string | null;
  regionId: number | null;
  breaking: boolean;
  publishedAt: Date;
};

/** HTTP validators from the last successful fetch, sent back for conditional requests. */
export type Validators = { etag: string | null; lastModified: string | null };

export type FeedFetch =
  | { status: "not-modified" }
  | { status: "ok"; items: FeedItem[]; validators: Validators };

export type NewsSource = {
  fetchFeed: (feed: FeedSpec, validators: Validators) => Promise<FeedFetch>;
  fetchBody: (item: FeedItem) => Promise<string>;
};

export const NO_VALIDATORS: Validators = { etag: null, lastModified: null };

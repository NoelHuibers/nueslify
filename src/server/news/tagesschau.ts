import { z } from "zod";
import { CATEGORY_IDS, REGIONS } from "#/lib/domain.ts";
import { conditionalGet, FeedHttpError, USER_AGENT } from "./http.ts";
import { htmlToText, isBroadcastReference, MAX_BODY_LENGTH, truncateText } from "./text.ts";
import type { FeedItem, FeedQuery, FeedSpec, Validators } from "./types.ts";

const API_BASE = "https://www.tagesschau.de/api2u";
const JSON_TYPE = "application/json";

const feedItemSchema = z.looseObject({
  externalId: z.string(),
  title: z.string(),
  date: z.string(),
  type: z.string(),
  topline: z.string().optional(),
  firstSentence: z.string().optional(),
  details: z.string().optional(),
  shareURL: z.string().optional(),
  detailsweb: z.string().optional(),
  ressort: z.string().optional(),
  regionId: z.number().optional(),
  breakingNews: z.boolean().optional(),
});

const feedSchema = z.object({ news: z.array(feedItemSchema) });

const detailsSchema = z.object({
  content: z.array(z.looseObject({ type: z.string(), value: z.string().optional() })).optional(),
});

export function parseFeed(json: unknown, query: FeedQuery): FeedItem[] {
  const { news } = feedSchema.parse(json);
  return news.flatMap((raw): FeedItem[] => {
    const shareUrl = raw.shareURL ?? raw.detailsweb;
    const publishedAt = new Date(raw.date);
    // Videos, live tickers and items without an article body can't be read out.
    if (raw.type !== "story" || !raw.details || !shareUrl || Number.isNaN(publishedAt.getTime())) {
      return [];
    }
    return [
      {
        id: raw.externalId,
        sourceId: "tagesschau",
        title: htmlToText(raw.title),
        topline: raw.topline ? htmlToText(raw.topline) : null,
        firstSentence: raw.firstSentence ? htmlToText(raw.firstSentence) : null,
        body: null,
        detailsUrl: raw.details,
        shareUrl,
        ressort: "ressort" in query ? query.ressort : (raw.ressort ?? null),
        regionId: "regionId" in query ? query.regionId : null,
        breaking: raw.breakingNews ?? false,
        publishedAt,
      },
    ];
  });
}

/** Extracts readable article text from a tagesschau details document. */
export function parseDetailsBody(json: unknown): string {
  const { content = [] } = detailsSchema.parse(json);
  const paragraphs = content
    .filter((block) => block.type === "text" || block.type === "headline")
    .map((block) => htmlToText(block.value ?? ""))
    .filter((text) => text.length > 0 && !isBroadcastReference(text));
  return truncateText(paragraphs.join("\n\n"), MAX_BODY_LENGTH);
}

export function feedUrl(query: FeedQuery): string {
  const params = new URLSearchParams(
    "ressort" in query ? { ressort: query.ressort } : { regions: String(query.regionId) },
  );
  return `${API_BASE}/news/?${params.toString()}`;
}

export async function fetchTagesschauFeed(
  fetchImpl: typeof fetch,
  feed: Extract<FeedSpec, { kind: "tagesschau" }>,
  validators: Validators,
) {
  const response = await conditionalGet(fetchImpl, feedUrl(feed.query), validators, JSON_TYPE);
  if (response.status === "not-modified") {
    return response;
  }
  const items = parseFeed(JSON.parse(response.body), feed.query);
  return { status: "ok" as const, items, validators: response.validators };
}

export async function fetchTagesschauBody(
  fetchImpl: typeof fetch,
  item: FeedItem,
): Promise<string> {
  const url = item.detailsUrl;
  if (!url?.startsWith(`${API_BASE}/`)) {
    throw new Error(`Refusing to fetch details from unexpected host: ${url ?? "(none)"}`);
  }
  const response = await fetchImpl(url, {
    headers: { accept: JSON_TYPE, "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new FeedHttpError(response.status, url);
  }
  return parseDetailsBody(await response.json());
}

export function tagesschauFeed(query: FeedQuery): Extract<FeedSpec, { kind: "tagesschau" }> {
  const key =
    "ressort" in query
      ? `tagesschau:ressort:${query.ressort}`
      : `tagesschau:region:${query.regionId}`;
  return { kind: "tagesschau", key, sourceId: "tagesschau", query };
}

export const ALL_TAGESSCHAU_FEEDS = [
  ...CATEGORY_IDS.map((ressort) => tagesschauFeed({ ressort })),
  ...REGIONS.map((region) => tagesschauFeed({ regionId: region.id })),
];

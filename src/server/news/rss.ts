import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { CategoryId } from "#/lib/domain.ts";
import { newsSourceInfo } from "#/lib/news/sources.ts";
import { canonicalUrl, inferCategory, isReadable, splitKicker } from "./classify.ts";
import { conditionalGet } from "./http.ts";
import { htmlToText, MAX_BODY_LENGTH, truncateText } from "./text.ts";
import type { FeedFetch, FeedItem, FeedSpec, Validators } from "./types.ts";

export type RssFeed = Extract<FeedSpec, { kind: "rss" }>;

const ACCEPT = "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8";
/** Big outlets list 150+ entries; the newest ones are all a radio show needs. */
const MAX_ITEMS = 30;
const MAX_TEASER_LENGTH = 400;
const HOUR = 3_600_000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  // XML's own entities only; HTML entities inside descriptions are decoded by htmlToText.
  htmlEntities: false,
  parseTagValue: false,
  isArray: (name) => name === "item" || name === "entry" || name === "category",
});

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function child(node: unknown, key: string): unknown {
  return isNode(node) ? node[key] : undefined;
}

function list(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/** Text content of an element, whether it parsed to a string or to `{ "#text": … }`. */
function text(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first === "string" || typeof first === "number") {
    return String(first);
  }
  const inner = child(first, "#text") ?? child(first, "@term");
  return typeof inner === "string" || typeof inner === "number" ? String(inner) : "";
}

/** RSS `<link>url</link>` or Atom `<link rel="alternate" href="url"/>`. */
function linkOf(entry: unknown): string | null {
  for (const link of list(child(entry, "link"))) {
    if (typeof link === "string" && link.trim()) {
      return link.trim();
    }
    const href = child(link, "@href");
    const rel = child(link, "@rel");
    if (typeof href === "string" && (rel === undefined || rel === "alternate")) {
      return href;
    }
  }
  const guid = text(child(entry, "guid"));
  return guid.startsWith("http") ? guid : null;
}

function dateOf(entry: unknown, now: Date): Date | null {
  const raw = ["pubDate", "dc:date", "published", "updated"]
    .map((key) => text(child(entry, key)))
    .find((value) => value.length > 0);
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }
  // Clock skew or time-zone bugs must not push a story to the top forever.
  return date.getTime() > now.getTime() + HOUR ? now : date;
}

export function storyId(sourceId: string, url: string): string {
  return `${sourceId}:${createHash("sha256").update(url).digest("hex").slice(0, 20)}`;
}

function toItem(entry: unknown, feed: RssFeed, now: Date): FeedItem | null {
  const link = linkOf(entry);
  const headline = htmlToText(text(child(entry, "title")));
  const publishedAt = dateOf(entry, now);
  if (!((link?.startsWith("https://") || link?.startsWith("http://")) && headline && publishedAt)) {
    return null;
  }
  const url = canonicalUrl(link);
  const categories = list(child(entry, "category")).map((category) => htmlToText(text(category)));
  if (!isReadable({ title: headline, url, categories })) {
    return null;
  }
  const description = htmlToText(text(child(entry, "description") ?? child(entry, "summary")));
  const content = htmlToText(text(child(entry, "content:encoded") ?? child(entry, "content")));
  const body = truncateText(
    content.length > description.length ? content : description,
    MAX_BODY_LENGTH,
  );
  const teaser = truncateText(description || content, MAX_TEASER_LENGTH);
  const { topline, title } = splitKicker(headline);
  const international = newsSourceInfo(feed.sourceId)?.country !== "DE";
  const fallback: CategoryId | null = feed.category ?? (international ? "ausland" : null);
  return {
    id: storyId(feed.sourceId, url),
    sourceId: feed.sourceId,
    title,
    topline,
    firstSentence: teaser || null,
    body,
    detailsUrl: null,
    shareUrl: url,
    ressort: inferCategory(url, categories, fallback),
    regionId: null,
    breaking: false,
    publishedAt,
  };
}

/** Parses RSS 2.0, RSS 1.0 (RDF) and Atom feeds into stories, newest first. */
export function parseRss(xml: string, feed: RssFeed, now = new Date()): FeedItem[] {
  const doc: unknown = parser.parse(xml);
  const entries = [
    ...list(child(child(child(doc, "rss"), "channel"), "item")),
    ...list(child(child(doc, "feed"), "entry")),
    ...list(child(child(doc, "rdf:RDF"), "item")),
  ];
  return entries
    .flatMap((entry) => toItem(entry, feed, now) ?? [])
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, MAX_ITEMS);
}

export async function fetchRssFeed(
  fetchImpl: typeof fetch,
  feed: RssFeed,
  validators: Validators,
): Promise<FeedFetch> {
  const response = await conditionalGet(fetchImpl, feed.url, validators, ACCEPT);
  if (response.status === "not-modified") {
    return response;
  }
  return { status: "ok", items: parseRss(response.body, feed), validators: response.validators };
}

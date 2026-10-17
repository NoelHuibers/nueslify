import type { CategoryId } from "#/lib/domain.ts";

/**
 * Heuristics that turn raw feed entries into stories worth reading out: which section a story
 * belongs to, which entries are not news at all (videos, live blogs, opinion, satire), and how
 * to tell two URLs of the same article apart from two articles.
 */

const SECTION_WORDS: readonly [CategoryId, ReadonlySet<string>][] = [
  [
    "sport",
    new Set([
      "sport",
      "sports",
      "fussball",
      "football",
      "soccer",
      "handball",
      "tennis",
      "formel1",
      "formel-1",
      "motorsport",
      "rugby-union",
      "cricket",
      "bundesliga",
    ]),
  ],
  [
    "wirtschaft",
    new Set([
      "wirtschaft",
      "business",
      "economy",
      "economics",
      "finanzen",
      "finance",
      "unternehmen",
      "boerse",
      "markets",
      "money",
      "geld",
    ]),
  ],
  [
    "wissen",
    new Set([
      "wissen",
      "wissenschaft",
      "science",
      "technology",
      "technik",
      "tech",
      "digital",
      "netzwelt",
      "gesundheit",
      "health",
      "global-health",
      "klima",
      "climate",
      "environment",
      "umwelt",
    ]),
  ],
  ["investigativ", new Set(["investigativ", "investigation", "investigations"])],
  ["inland", new Set(["inland", "deutschland", "germany", "german politics", "innenpolitik"])],
  [
    "ausland",
    new Set([
      "ausland",
      "world",
      "world news",
      "international",
      "welt",
      "europe",
      "europa",
      "middle-east",
      "nahost",
      "africa",
      "asia",
      "americas",
      "us-news",
      "uk-news",
      "ukraine",
    ]),
  ],
];

/**
 * Picks the section from the URL path (most specific signal), then the feed's own categories,
 * then the feed's default.
 */
export function inferCategory(
  url: string,
  categories: readonly string[],
  fallback: CategoryId | null,
): CategoryId | null {
  const path = new URL(url).pathname
    .split("/")
    .map((segment) => decodeURIComponent(segment).toLowerCase());
  for (const word of [...path, ...categories.map((category) => category.toLowerCase())]) {
    for (const [category, words] of SECTION_WORDS) {
      if (words.has(word)) {
        return category;
      }
    }
  }
  return fallback;
}

const SKIPPED_PATH =
  /\/(videos?|podcasts?|audio|live|liveblog|liveticker|newsblog|newsticker|meinung|kommentare?|opinion|commentisfree|satire|bilder|fotostrecke|gallery|galerie|quiz|ratgeber|kaufberatung|gutscheine|deals|shopping|horoskop)\b/i;
const SKIPPED_TITLE =
  /^(\+\+\+|live\s*[:|–-]|watch:|video:|podcast\b|kommentar\b|meinung\b|opinion\b|quiz\b|horoskop\b)|\b(liveblog|live-?ticker|newsblog|news-?ticker)\b/i;
const SKIPPED_CATEGORY = new Set([
  "video",
  "videos",
  "podcast",
  "podcasts",
  "satire",
  "kommentar",
  "kommentare",
  "meinung",
  "opinion",
  "show types",
]);

/** False for entries a newsreader shouldn't present as news. */
export function isReadable(entry: {
  title: string;
  url: string;
  categories: readonly string[];
}): boolean {
  const path = new URL(entry.url).pathname;
  return !(
    SKIPPED_PATH.test(path) ||
    SKIPPED_TITLE.test(entry.title) ||
    entry.categories.some((category) => SKIPPED_CATEGORY.has(category.toLowerCase()))
  );
}

const TRACKING_PARAM =
  /^(utm_|at_|wt_|mc_|maca$|traffic_source$|ref$|xtor$|cmp$|ito$|fbclid$|gclid$)/i;

/** Drops fragments and tracking parameters so the same article always gets the same id. */
export function canonicalUrl(link: string): string {
  const url = new URL(link);
  url.hash = "";
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(name)) {
      url.searchParams.delete(name);
    }
  }
  return url.toString();
}

const KICKER = /^(.{2,40}?)(?::| -| –) (.{20,})$/u;
const QUOTES = /["“”„‘’'?!]/u;
const WORDS = /\s+/u;
const UPPERCASE_RUN = /\p{Lu}{3}/u;

function tidyKicker(kicker: string): string {
  // NZZ writes kickers in capitals ("MELDUNGEN POLIZEI"); speak them as words.
  if (kicker === kicker.toUpperCase() && UPPERCASE_RUN.test(kicker)) {
    return kicker
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return kicker;
}

/** German outlets prefix headlines with a kicker ("Junge Union: Winkel wiedergewählt"). */
export function splitKicker(headline: string): { topline: string | null; title: string } {
  const match = KICKER.exec(headline);
  const kicker = match?.[1]?.trim();
  const rest = match?.[2]?.trim();
  if (!(kicker && rest) || QUOTES.test(kicker) || kicker.split(WORDS).length > 5) {
    return { topline: null, title: headline };
  }
  return { topline: tidyKicker(kicker), title: rest };
}

/**
 * Types for the news outlets a listener can pick from. Shared by server (ingestion) and client (picker).
 *
 * Political leaning and factual reporting come from Media Bias/Fact Check (MBFC), an independent
 * rater with published methodology; each source links to its rating page. Ownership is taken
 * from the same pages and the outlets' own imprints. Ratings are one outside opinion, shown so
 * listeners can build a balanced mix, not a verdict.
 */

export const LEANINGS = ["left", "center-left", "center", "center-right", "right"] as const;
export type Leaning = (typeof LEANINGS)[number];

export const LEANING_LABEL: Record<Leaning, string> = {
  left: "Left",
  "center-left": "Centre-left",
  center: "Centre",
  "center-right": "Centre-right",
  right: "Right",
};

export type FactualRating = "very-high" | "high" | "mostly-factual" | "mixed";

export const FACTUAL_LABEL: Record<FactualRating, string> = {
  "very-high": "Very high",
  high: "High",
  "mostly-factual": "Mostly factual",
  mixed: "Mixed",
};

/** How an outlet is owned and funded. */
export type Ownership = "public" | "state" | "private" | "trust" | "cooperative" | "nonprofit";

export type NewsSourceInfo = {
  readonly id: string;
  readonly name: string;
  /** Shown in "Read on …" links. */
  readonly domain: string;
  readonly homepage: string;
  /** ISO 3166-1 alpha-2 code of the outlet's home country. */
  readonly country: string;
  readonly language: "de" | "en";
  readonly ownership: Ownership;
  /** Who owns or funds it, in a few words. */
  readonly owner: string;
  readonly leaning: Leaning;
  readonly factual: FactualRating;
  readonly ratingUrl: string;
  /** tagesschau offers full articles and regional news; RSS feeds carry teasers. */
  readonly regional?: true;
};

export const mbfc = (slug: string) => `https://mediabiasfactcheck.com/${slug}/`;

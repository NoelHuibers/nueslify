import { GERMAN_SOURCES } from "./germany.ts";
import { INTERNATIONAL_SOURCES } from "./international.ts";
import { LEANINGS, type Leaning, type NewsSourceInfo } from "./types.ts";

export const NEWS_SOURCES = [...GERMAN_SOURCES, ...INTERNATIONAL_SOURCES] as const;

export type NewsSourceId = (typeof NEWS_SOURCES)[number]["id"];
export const NEWS_SOURCE_IDS = NEWS_SOURCES.map((source) => source.id) as [
  NewsSourceId,
  ...NewsSourceId[],
];
export const DEFAULT_NEWS_SOURCES: NewsSourceId[] = ["tagesschau"];

const BY_ID = new Map<string, NewsSourceInfo>(NEWS_SOURCES.map((source) => [source.id, source]));

export function newsSourceInfo(id: string): NewsSourceInfo | undefined {
  return BY_ID.get(id);
}

export function isNewsSourceId(id: string): id is NewsSourceId {
  return BY_ID.has(id);
}

/** Display name for a source id, falling back to the id for retired sources. */
export function newsSourceName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}

const COUNTRY_NAME: Record<string, string> = {
  DE: "Germany",
  GB: "United Kingdom",
  US: "United States",
  FR: "France",
  BE: "Belgium",
  CH: "Switzerland",
  QA: "Qatar",
};

export function countryName(code: string): string {
  return COUNTRY_NAME[code] ?? code;
}

/** "Öffentlich-rechtlich" is the term German listeners know for ARD, ZDF and Deutschlandradio. */
export function ownershipLabel(source: Pick<NewsSourceInfo, "ownership" | "country">): string {
  switch (source.ownership) {
    case "public":
      return source.country === "DE" ? "Öffentlich-rechtlich" : "Public service";
    case "state":
      return "State-owned";
    case "private":
      return "Private";
    case "trust":
      return "Trust-owned";
    case "cooperative":
      return "Cooperative";
    case "nonprofit":
      return "Non-profit";
    default:
      return source.ownership satisfies never;
  }
}

export function isGerman(source: Pick<NewsSourceInfo, "country">): boolean {
  return source.country === "DE";
}

const LEANING_SCORE: Record<Leaning, number> = {
  left: -2,
  "center-left": -1,
  center: 0,
  "center-right": 1,
  right: 2,
};

/** Where a selection of sources sits on average, rounded to the nearest step. */
export function averageLeaning(ids: readonly string[]): Leaning | null {
  const scores = ids.flatMap((id) => {
    const source = BY_ID.get(id);
    return source ? [LEANING_SCORE[source.leaning]] : [];
  });
  if (scores.length === 0) {
    return null;
  }
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return LEANINGS[Math.round(mean) + 2] ?? "center";
}

export function leaningPosition(leaning: Leaning): number {
  return LEANING_SCORE[leaning] + 2;
}

export const NEWS_SOURCE_PRESETS = [
  {
    id: "public",
    label: "Public broadcasters",
    sources: ["tagesschau", "zdf", "dlf", "bbc"],
  },
  {
    id: "spectrum",
    label: "Across the spectrum",
    sources: ["tagesschau", "taz", "spiegel", "faz", "welt", "bbc", "guardian", "telegraph"],
  },
  {
    id: "international",
    label: "International",
    sources: ["tagesschau", "bbc", "guardian", "nyt", "france24", "aljazeera"],
  },
] as const satisfies readonly { id: string; label: string; sources: readonly NewsSourceId[] }[];

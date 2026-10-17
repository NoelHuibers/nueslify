import { z } from "zod";
import { GENRE_IDS, MUSIC_PROVIDER_IDS, type MusicProviderId } from "./music.ts";
import { DEFAULT_NEWS_SOURCES, NEWS_SOURCE_IDS, type NewsSourceId } from "./news/sources.ts";

/** News categories, mapped 1:1 to tagesschau "ressorts". */
export const CATEGORIES = [
  { id: "inland", label: "Germany", image: "/photos/inland.webp" },
  { id: "ausland", label: "World", image: "/photos/ausland.webp" },
  { id: "wirtschaft", label: "Business", image: "/photos/business.webp" },
  { id: "sport", label: "Sports", image: "/photos/sports.webp" },
  { id: "investigativ", label: "Investigative", image: "/photos/investigativ.webp" },
  { id: "wissen", label: "Science", image: "/photos/faktenfinder.webp" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

/** German federal states, using the region ids of the tagesschau API. */
export const REGIONS = [
  { id: 1, name: "Baden-Württemberg" },
  { id: 2, name: "Bayern" },
  { id: 3, name: "Berlin" },
  { id: 4, name: "Brandenburg" },
  { id: 5, name: "Bremen" },
  { id: 6, name: "Hamburg" },
  { id: 7, name: "Hessen" },
  { id: 8, name: "Mecklenburg-Vorpommern" },
  { id: 9, name: "Niedersachsen" },
  { id: 10, name: "Nordrhein-Westfalen" },
  { id: 11, name: "Rheinland-Pfalz" },
  { id: 12, name: "Saarland" },
  { id: 13, name: "Sachsen" },
  { id: 14, name: "Sachsen-Anhalt" },
  { id: 15, name: "Schleswig-Holstein" },
  { id: 16, name: "Thüringen" },
] as const;

export function regionName(id: number | null | undefined): string | null {
  return REGIONS.find((r) => r.id === id)?.name ?? null;
}

export const HOST_STYLES = [
  { id: "friendly", label: "Friendly", description: "Warm, witty and a little cheeky." },
  { id: "professional", label: "Professional", description: "Calm, concise, news-desk serious." },
  { id: "laidback", label: "Laid-back", description: "Casual, playful, thought-provoking." },
] as const;
export type HostStyle = (typeof HOST_STYLES)[number]["id"];

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
] as const;
export type Language = (typeof LANGUAGES)[number]["id"];

export const VOICES = [
  { id: "fable", label: "Fable", description: "Expressive storyteller" },
  { id: "nova", label: "Nova", description: "Bright and upbeat" },
  { id: "onyx", label: "Onyx", description: "Deep and steady" },
  { id: "coral", label: "Coral", description: "Warm and friendly" },
  { id: "sage", label: "Sage", description: "Calm and measured" },
  { id: "ash", label: "Ash", description: "Clear and direct" },
] as const;
export type Voice = (typeof VOICES)[number]["id"];

export const AI_PROVIDERS = [
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Google Gemini" },
] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number]["id"];

export const MUSIC_RANGES = [
  { id: "short_term", label: "Current favourites", description: "Roughly the last 4 weeks" },
  { id: "medium_term", label: "Recent favourites", description: "Roughly the last 6 months" },
  { id: "long_term", label: "All-time favourites", description: "Your listening over the years" },
] as const;
export type MusicRange = (typeof MUSIC_RANGES)[number]["id"];

const ids = <T extends readonly { id: string }[]>(items: T) =>
  items.map((i) => i.id) as [T[number]["id"], ...T[number]["id"][]];

export const preferencesSchema = z.object({
  displayName: z.string().trim().min(1, "Tell your host what to call you").max(40),
  language: z.enum(ids(LANGUAGES)),
  hostStyle: z.enum(ids(HOST_STYLES)),
  voice: z.enum(ids(VOICES)),
  aiProvider: z.enum(ids(AI_PROVIDERS)),
  musicRange: z.enum(ids(MUSIC_RANGES)),
  /** 0 = only news, 100 = only music. */
  balance: z.number().int().min(0).max(100),
  categories: z.array(z.enum(CATEGORY_IDS)).max(CATEGORIES.length),
  regionId: z.number().int().min(1).max(REGIONS.length).nullable(),
  /** Whether the host may mention song titles and artists in its moderation. */
  mentionTracks: z.boolean(),
  /** Where music comes from: a specific service, the best available one, or no music at all. */
  musicSource: z.enum(["auto", "none", ...MUSIC_PROVIDER_IDS]),
  /** Genres for account-free catalogues (Audius, Jamendo). Empty means "what's popular". */
  genres: z.array(z.enum(GENRE_IDS)).max(GENRE_IDS.length),
  /** Outlets the news comes from (see lib/news/sources.ts). */
  newsSources: z
    .array(z.enum(NEWS_SOURCE_IDS))
    .min(1, "Pick at least one news source")
    .max(NEWS_SOURCE_IDS.length),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
  displayName: "",
  language: "en",
  hostStyle: "friendly",
  voice: "fable",
  aiProvider: "openai",
  musicRange: "medium_term",
  balance: 50,
  categories: ["inland", "ausland", "wirtschaft"],
  regionId: null,
  mentionTracks: true,
  musicSource: "auto",
  genres: [],
  newsSources: DEFAULT_NEWS_SOURCES,
};

/** Show segments as delivered to the player. */
export type StoryRef = {
  id: string;
  sourceId: NewsSourceId;
  /** Other selected outlets covering the same story, mentioned by the host. */
  alsoReportedBy: NewsSourceId[];
  title: string;
  topline: string | null;
  ressort: string | null;
  regionId: number | null;
  shareUrl: string;
  publishedAt: string;
};

export type TrackRef = {
  provider: MusicProviderId;
  /** Provider-native id (Spotify id, Apple catalog id, YouTube video id, …). */
  id: string;
  /** Provider-native URI used by the player, e.g. `spotify:track:…`. Equals `id` elsewhere. */
  uri: string;
  name: string;
  artists: string[];
  /** Link back to the track on the provider (required by most providers' terms). */
  url: string;
  durationMs: number | null;
  /** Direct audio URL for streamable catalogues; `null` when the provider's own player plays it. */
  streamUrl: string | null;
  /** Attribution line for openly licensed music, e.g. "CC BY-SA 4.0 · via Jamendo". */
  credit: { label: string; url: string } | null;
};

export type HostRole = "intro" | "bridge";

export type HostSegment = {
  id: string;
  kind: "host";
  role: HostRole;
  audioUrl: string;
  transcript: string;
};

export type NewsSegment = {
  id: string;
  kind: "news";
  audioUrl: string;
  transcript: string;
  story: StoryRef;
};

export type MusicSegment = {
  id: string;
  kind: "music";
  track: TrackRef;
};

export type Segment = HostSegment | NewsSegment | MusicSegment;

export type ShowBlock = {
  index: number;
  segments: Segment[];
  /** Non-fatal notices, e.g. "Spotify quota exceeded, playing news only". */
  notices: string[];
};

export function isAudioSegment(segment: Segment): segment is HostSegment | NewsSegment {
  return segment.kind !== "music";
}

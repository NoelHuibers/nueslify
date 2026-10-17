/**
 * Music sources Nueslify can play from. Shared between server and client.
 *
 * - "account" sources use the listener's own account (their favourites, full tracks with a
 *   subscription) and play inside the service's official player or SDK.
 * - "catalog" sources need no account: free, openly licensed catalogues streamed directly.
 */
export const MUSIC_PROVIDERS = [
  {
    id: "spotify",
    label: "Spotify",
    kind: "account",
    playback: "embed",
    website: "https://open.spotify.com",
    description: "Your top tracks, played in Spotify's own player.",
  },
  {
    id: "apple-music",
    label: "Apple Music",
    kind: "account",
    playback: "sdk",
    website: "https://music.apple.com",
    description: "Your recently played songs, via MusicKit. Needs an Apple Music subscription.",
  },
  {
    id: "tidal",
    label: "TIDAL",
    kind: "account",
    playback: "sdk",
    website: "https://tidal.com",
    description: "Tracks from your TIDAL collection, via TIDAL's web player.",
  },
  {
    id: "youtube",
    label: "YouTube Music",
    kind: "account",
    playback: "embed",
    website: "https://music.youtube.com",
    description: "Your liked music, played in YouTube's embedded player.",
  },
  {
    id: "audius",
    label: "Audius",
    kind: "catalog",
    playback: "stream",
    website: "https://audius.co",
    description: "Free, artist-owned music. No account needed.",
  },
  {
    id: "jamendo",
    label: "Jamendo",
    kind: "catalog",
    playback: "stream",
    website: "https://www.jamendo.com",
    description: "Creative Commons music from independent artists. No account needed.",
  },
] as const;

export type MusicProvider = (typeof MUSIC_PROVIDERS)[number];
export type MusicProviderId = MusicProvider["id"];
export type MusicSourceChoice = MusicProviderId | "auto" | "none";

export const MUSIC_PROVIDER_IDS = MUSIC_PROVIDERS.map((p) => p.id) as [
  MusicProviderId,
  ...MusicProviderId[],
];

export function musicProvider(id: MusicProviderId): MusicProvider {
  const provider = MUSIC_PROVIDERS.find((p) => p.id === id);
  if (!provider) {
    throw new Error(`Unknown music provider ${id}`);
  }
  return provider;
}

/** Genres for account-free catalogues, mapped to each catalogue's own vocabulary. */
export const GENRES = [
  { id: "pop", label: "Pop", audius: "Pop", jamendo: "pop" },
  { id: "electronic", label: "Electronic", audius: "Electronic", jamendo: "electronic" },
  { id: "hiphop", label: "Hip-Hop", audius: "Hip-Hop/Rap", jamendo: "hiphop" },
  { id: "rock", label: "Rock", audius: "Rock", jamendo: "rock" },
  { id: "indie", label: "Indie", audius: "Alternative", jamendo: "indie" },
  { id: "jazz", label: "Jazz", audius: "Jazz", jamendo: "jazz" },
  { id: "ambient", label: "Ambient", audius: "Ambient", jamendo: "ambient" },
  { id: "classical", label: "Classical", audius: "Classical", jamendo: "classical" },
  { id: "lofi", label: "Lo-fi", audius: "Lo-Fi", jamendo: "lounge" },
] as const;

export type GenreId = (typeof GENRES)[number]["id"];
export const GENRE_IDS = GENRES.map((g) => g.id) as [GenreId, ...GenreId[]];

export type SourceAvailability = {
  id: MusicProviderId;
  configured: boolean;
  connected: boolean;
};

/**
 * Which source a show plays from: the explicit choice when usable, otherwise the listener's
 * first connected account, otherwise the first free catalogue. `null` means no music.
 */
export function chooseSource(
  sources: readonly SourceAvailability[],
  choice: MusicSourceChoice,
): MusicProviderId | null {
  if (choice === "none") {
    return null;
  }
  const usable = (id: MusicProviderId) =>
    sources.some((source) => source.id === id && source.configured && source.connected);
  if (choice !== "auto" && usable(choice)) {
    return choice;
  }
  return MUSIC_PROVIDERS.map((provider) => provider.id).find(usable) ?? null;
}

/** Google scope that lets Nueslify read the listener's liked YouTube videos. */
export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

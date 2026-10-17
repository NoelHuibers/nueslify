import type { MusicRange, TrackRef } from "#/lib/domain.ts";
import {
  chooseSource,
  type GenreId,
  MUSIC_PROVIDERS,
  type MusicProviderId,
  type MusicSourceChoice,
} from "#/lib/music.ts";
import { env } from "#/server/env.ts";
import { appleMusicSource } from "./apple-music.ts";
import { audiusSource } from "./audius.ts";
import { FIXTURE_TRACKS } from "./fixture.ts";
import { jamendoSource } from "./jamendo.ts";
import { spotifySource } from "./spotify.ts";
import { tidalSource } from "./tidal.ts";
import type { MusicSourceAdapter } from "./types.ts";
import { youtubeSource } from "./youtube.ts";

/** Every music plugin. Add a provider by writing an adapter and listing it here. */
export const MUSIC_SOURCES: Record<MusicProviderId, MusicSourceAdapter> = {
  spotify: spotifySource,
  "apple-music": appleMusicSource,
  tidal: tidalSource,
  youtube: youtubeSource,
  audius:
    env.MUSIC_CATALOG === "fixture"
      ? { ...audiusSource, fetchTracks: () => Promise.resolve(FIXTURE_TRACKS) }
      : audiusSource,
  jamendo: jamendoSource,
};

export type MusicSourceStatus = {
  id: MusicProviderId;
  configured: boolean;
  connected: boolean;
  experimental: boolean;
};

export function listMusicSources(
  userId: string,
  sources: Record<MusicProviderId, MusicSourceAdapter> = MUSIC_SOURCES,
): Promise<MusicSourceStatus[]> {
  return Promise.all(
    MUSIC_PROVIDERS.map(async ({ id }) => {
      const source = sources[id];
      const configured = source.isConfigured();
      return {
        id,
        configured,
        connected: configured && (await source.isConnected(userId)),
        experimental: source.experimental ?? false,
      };
    }),
  );
}

/** The source a show plays from — see `chooseSource` for the rules. */
export async function resolveMusicSource(
  userId: string,
  choice: MusicSourceChoice,
  sources: Record<MusicProviderId, MusicSourceAdapter> = MUSIC_SOURCES,
): Promise<MusicSourceAdapter | null> {
  if (choice === "none") {
    return null;
  }
  const id = chooseSource(await listMusicSources(userId, sources), choice);
  return id ? sources[id] : null;
}

const TTL_MS = 15 * 60_000;
const cache = new Map<string, { expiresAt: number; tracks: TrackRef[] }>();

/** Tracks for a listener's show, cached briefly to stay well inside every provider's quota. */
export async function tracksFor(
  request: {
    userId: string;
    choice: MusicSourceChoice;
    range: MusicRange;
    genres: readonly GenreId[];
  },
  sources: Record<MusicProviderId, MusicSourceAdapter> = MUSIC_SOURCES,
): Promise<{ provider: MusicProviderId; tracks: TrackRef[] } | null> {
  const source = await resolveMusicSource(request.userId, request.choice, sources);
  if (!source) {
    return null;
  }
  const key = [request.userId, source.id, request.range, [...request.genres].sort().join(",")].join(
    ":",
  );
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return { provider: source.id, tracks: hit.tracks };
  }
  const tracks = await source.fetchTracks({ ...request, limit: 50 });
  cache.set(key, { expiresAt: Date.now() + TTL_MS, tracks });
  return { provider: source.id, tracks };
}

export function forgetMusicCache(userId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      cache.delete(key);
    }
  }
}

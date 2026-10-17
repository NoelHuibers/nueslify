import { z } from "zod";
import { mapWithConcurrency } from "#/lib/async.ts";
import type { TrackRef } from "#/lib/domain.ts";
import { GENRES, type GenreId } from "#/lib/music.ts";
import { env } from "#/server/env.ts";
import { errorFromResponse, HTTP_TIMEOUT_MS, type MusicSourceAdapter } from "./types.ts";

const API = "https://api.audius.co/v1";

const trendingSchema = z.object({
  data: z.array(
    z.looseObject({
      id: z.string(),
      title: z.string(),
      duration: z.number().optional(),
      permalink: z.string(),
      is_streamable: z.boolean().optional(),
      user: z.looseObject({ name: z.string() }),
    }),
  ),
});

export function parseAudiusTracks(json: unknown, appName: string): TrackRef[] {
  return trendingSchema
    .parse(json)
    .data.filter((track) => track.is_streamable !== false)
    .map((track) => {
      const url = `https://audius.co${track.permalink}`;
      return {
        provider: "audius",
        id: track.id,
        uri: track.id,
        name: track.title,
        artists: [track.user.name],
        url,
        durationMs: track.duration ? track.duration * 1000 : null,
        streamUrl: `${API}/tracks/${encodeURIComponent(track.id)}/stream?app_name=${encodeURIComponent(appName)}`,
        credit: { label: "via Audius", url },
      };
    });
}

export async function getTrending(
  genres: readonly GenreId[],
  options: { limit?: number; appName?: string; fetchImpl?: typeof fetch } = {},
): Promise<TrackRef[]> {
  const { limit = 30, appName = env.AUDIUS_APP_NAME, fetchImpl = fetch } = options;
  const audiusGenres = GENRES.filter((g) => genres.includes(g.id)).map((g) => g.audius);
  const queries: (string | null)[] = audiusGenres.length > 0 ? audiusGenres : [null];
  const perGenre = Math.max(5, Math.ceil(limit / queries.length));

  const lists = await mapWithConcurrency(queries, 4, async (genre) => {
    const params = new URLSearchParams({
      time: "week",
      limit: String(perGenre),
      app_name: appName,
    });
    if (genre) {
      params.set("genre", genre);
    }
    const response = await fetchImpl(`${API}/tracks/trending?${params.toString()}`, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw await errorFromResponse("audius", response);
    }
    return parseAudiusTracks(await response.json(), appName);
  });
  return lists.flat();
}

export const audiusSource: MusicSourceAdapter = {
  id: "audius",
  isConfigured: () => !env.AUDIUS_DISABLED,
  isConnected: () => Promise.resolve(true),
  fetchTracks: ({ genres, limit }) => getTrending(genres, { limit }),
};

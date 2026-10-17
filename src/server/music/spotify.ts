import { z } from "zod";
import type { MusicRange, TrackRef } from "#/lib/domain.ts";
import { spotifyConfigured } from "#/server/env.ts";
import { accessTokenFor, findLinkedAccount } from "./accounts.ts";
import { errorFromResponse, HTTP_TIMEOUT_MS, type MusicSourceAdapter } from "./types.ts";

const topTracksSchema = z.object({
  items: z.array(
    z.looseObject({
      id: z.string(),
      uri: z.string(),
      name: z.string(),
      duration_ms: z.number().optional(),
      is_playable: z.boolean().optional(),
      artists: z.array(z.looseObject({ name: z.string() })),
      external_urls: z.looseObject({ spotify: z.string().optional() }).optional(),
    }),
  ),
});

export function spotifyTrackUrl(id: string): string {
  return `https://open.spotify.com/track/${encodeURIComponent(id)}`;
}

export async function getTopTracks(
  accessToken: string,
  range: MusicRange,
  options: { limit?: number; fetchImpl?: typeof fetch } = {},
): Promise<TrackRef[]> {
  const { limit = 50, fetchImpl = fetch } = options;
  const params = new URLSearchParams({ time_range: range, limit: String(limit) });
  const response = await fetchImpl(
    `https://api.spotify.com/v1/me/top/tracks?${params.toString()}`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw await errorFromResponse("spotify", response);
  }
  const { items } = topTracksSchema.parse(await response.json());
  return items
    .filter((item) => item.is_playable !== false)
    .map((item) => ({
      provider: "spotify",
      id: item.id,
      uri: item.uri,
      name: item.name,
      artists: item.artists.map((artist) => artist.name),
      url: item.external_urls?.spotify ?? spotifyTrackUrl(item.id),
      durationMs: item.duration_ms ?? null,
      streamUrl: null,
      credit: null,
    }));
}

export const spotifySource: MusicSourceAdapter = {
  id: "spotify",
  isConfigured: () => spotifyConfigured,
  isConnected: async (userId) => (await findLinkedAccount(userId, "spotify")) !== null,
  fetchTracks: async ({ userId, range, limit }) =>
    getTopTracks(await accessTokenFor(userId, "spotify"), range, { limit }),
};

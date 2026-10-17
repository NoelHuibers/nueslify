import { z } from "zod";
import { mapWithConcurrency } from "#/lib/async.ts";
import type { TrackRef } from "#/lib/domain.ts";
import { GENRES, type GenreId } from "#/lib/music.ts";
import { env } from "#/server/env.ts";
import { errorFromResponse, HTTP_TIMEOUT_MS, type MusicSourceAdapter } from "./types.ts";

const API = "https://api.jamendo.com/v3.0";
const CC_PATH = /creativecommons\.org\/licenses\/([a-z-]+)\/([\d.]+)/i;

const tracksSchema = z.object({
  results: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      duration: z.number().optional(),
      artist_name: z.string(),
      audio: z.string(),
      shareurl: z.string().optional(),
      license_ccurl: z.string().optional(),
      audiodownload_allowed: z.boolean().optional(),
    }),
  ),
});

/** "https://creativecommons.org/licenses/by-nc-sa/3.0/" → "CC BY-NC-SA 3.0" */
export function licenseLabel(url: string | undefined): string {
  const match = url ? CC_PATH.exec(url) : null;
  return match ? `CC ${match[1]?.toUpperCase()} ${match[2]}` : "Creative Commons";
}

export function parseJamendoTracks(json: unknown): TrackRef[] {
  return tracksSchema
    .parse(json)
    .results.filter((track) => track.audio.length > 0)
    .map((track) => {
      const url = track.shareurl ?? `https://www.jamendo.com/track/${encodeURIComponent(track.id)}`;
      return {
        provider: "jamendo",
        id: track.id,
        uri: track.id,
        name: track.name,
        artists: [track.artist_name],
        url,
        durationMs: track.duration ? track.duration * 1000 : null,
        streamUrl: track.audio,
        // Jamendo's terms: credit the artist, credit Jamendo, link back to the track page.
        credit: { label: `${licenseLabel(track.license_ccurl)} · via Jamendo`, url },
      };
    });
}

export async function getPopularTracks(
  clientId: string,
  genres: readonly GenreId[],
  options: { limit?: number; fetchImpl?: typeof fetch } = {},
): Promise<TrackRef[]> {
  const { limit = 30, fetchImpl = fetch } = options;
  const tags = GENRES.filter((g) => genres.includes(g.id)).map((g) => g.jamendo);
  const queries: (string | null)[] = tags.length > 0 ? tags : [null];
  const perTag = Math.max(5, Math.ceil(limit / queries.length));

  const lists = await mapWithConcurrency(queries, 4, async (tag) => {
    const params = new URLSearchParams({
      client_id: clientId,
      format: "json",
      limit: String(perTag),
      order: "popularity_week",
      audioformat: "mp32",
      include: "licenses",
    });
    if (tag) {
      params.set("tags", tag);
    }
    const response = await fetchImpl(`${API}/tracks/?${params.toString()}`, {
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw await errorFromResponse("jamendo", response);
    }
    return parseJamendoTracks(await response.json());
  });
  return lists.flat();
}

export const jamendoSource: MusicSourceAdapter = {
  id: "jamendo",
  isConfigured: () => Boolean(env.JAMENDO_CLIENT_ID),
  isConnected: () => Promise.resolve(true),
  fetchTracks: ({ genres, limit }) =>
    getPopularTracks(env.JAMENDO_CLIENT_ID ?? "", genres, { limit }),
};

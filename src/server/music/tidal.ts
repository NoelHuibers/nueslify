import { z } from "zod";
import type { TrackRef } from "#/lib/domain.ts";
import { env } from "#/server/env.ts";
import { accessTokenFor, findLinkedAccount } from "./accounts.ts";
import { TIDAL_API } from "./tidal-config.ts";
import {
  errorFromResponse,
  HTTP_TIMEOUT_MS,
  isoDurationToMs,
  type MusicSourceAdapter,
} from "./types.ts";

const resourceIdentifier = z.object({ id: z.string(), type: z.string() });

const collectionSchema = z.object({ data: z.array(resourceIdentifier) });

const userSchema = z.object({
  data: z.object({ attributes: z.looseObject({ country: z.string().optional() }) }),
});

const tracksSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      type: z.literal("tracks"),
      attributes: z.looseObject({ title: z.string(), duration: z.string().optional() }),
      relationships: z
        .looseObject({
          artists: z.object({ data: z.array(resourceIdentifier) }).optional(),
        })
        .optional(),
    }),
  ),
  included: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        attributes: z.looseObject({ name: z.string().optional() }).optional(),
      }),
    )
    .optional(),
});

/** Joins JSON:API track resources with their included artists. */
export function parseTidalTracks(json: unknown): TrackRef[] {
  const { data, included = [] } = tracksSchema.parse(json);
  const artistNames = new Map(
    included
      .filter((resource) => resource.type === "artists")
      .map((resource) => [resource.id, resource.attributes?.name ?? ""]),
  );
  return data.map((track) => ({
    provider: "tidal",
    id: track.id,
    uri: track.id,
    name: track.attributes.title,
    artists: (track.relationships?.artists?.data ?? [])
      .map((artist) => artistNames.get(artist.id) ?? "")
      .filter((name) => name.length > 0),
    url: `https://tidal.com/browse/track/${encodeURIComponent(track.id)}`,
    durationMs: isoDurationToMs(track.attributes.duration),
    streamUrl: null,
    credit: null,
  }));
}

async function tidalGet(path: string, token: string, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(`${TIDAL_API}${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.api+json" },
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw await errorFromResponse("tidal", response);
  }
  return response.json();
}

export async function getCollectionTracks(
  token: string,
  options: { limit?: number; fetchImpl?: typeof fetch } = {},
): Promise<TrackRef[]> {
  const { limit = 50, fetchImpl = fetch } = options;
  const [collection, me] = await Promise.all([
    tidalGet("/userCollectionTracks/me/relationships/items?sort=-addedAt", token, fetchImpl),
    tidalGet("/users/me", token, fetchImpl),
  ]);
  const ids = collectionSchema
    .parse(collection)
    .data.filter((item) => item.type === "tracks")
    .slice(0, limit)
    .map((item) => item.id);
  if (ids.length === 0) {
    return [];
  }
  const params = new URLSearchParams({ include: "artists" });
  const { country } = userSchema.parse(me).data.attributes;
  if (country) {
    params.set("countryCode", country);
  }
  for (const id of ids) {
    params.append("filter[id]", id);
  }
  return parseTidalTracks(await tidalGet(`/tracks?${params.toString()}`, token, fetchImpl));
}

export const tidalSource: MusicSourceAdapter = {
  id: "tidal",
  isConfigured: () => Boolean(env.TIDAL_CLIENT_ID && env.TIDAL_CLIENT_SECRET),
  isConnected: async (userId) => (await findLinkedAccount(userId, "tidal")) !== null,
  fetchTracks: async ({ userId, limit }) =>
    getCollectionTracks(await accessTokenFor(userId, "tidal"), { limit }),
  experimental: true,
};

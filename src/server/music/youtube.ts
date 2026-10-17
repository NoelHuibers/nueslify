import { z } from "zod";
import type { TrackRef } from "#/lib/domain.ts";
import { YOUTUBE_SCOPE } from "#/lib/music.ts";
import { env } from "#/server/env.ts";
import { accessTokenFor, findLinkedAccount, hasScope } from "./accounts.ts";
import {
  errorFromResponse,
  HTTP_TIMEOUT_MS,
  isoDurationToMs,
  type MusicSourceAdapter,
} from "./types.ts";

/** YouTube's "Music" video category. */
const MUSIC_CATEGORY = "10";
const TOPIC_SUFFIX = / - Topic$/;

const likedVideosSchema = z.object({
  items: z.array(
    z.looseObject({
      id: z.string(),
      snippet: z.looseObject({
        title: z.string(),
        channelTitle: z.string(),
        categoryId: z.string().optional(),
      }),
      contentDetails: z.looseObject({ duration: z.string().optional() }).optional(),
      status: z.looseObject({ embeddable: z.boolean().optional() }).optional(),
    }),
  ),
});

/** Turns liked YouTube videos into tracks: music category only, and embeddable. */
export function parseLikedVideos(json: unknown): TrackRef[] {
  return likedVideosSchema
    .parse(json)
    .items.filter(
      (item) => item.snippet.categoryId === MUSIC_CATEGORY && item.status?.embeddable !== false,
    )
    .map((item) => ({
      provider: "youtube",
      id: item.id,
      uri: item.id,
      name: item.snippet.title,
      // Auto-generated "Artist - Topic" channels carry the artist's name.
      artists: [item.snippet.channelTitle.replace(TOPIC_SUFFIX, "")],
      url: `https://music.youtube.com/watch?v=${encodeURIComponent(item.id)}`,
      durationMs: isoDurationToMs(item.contentDetails?.duration),
      streamUrl: null,
      credit: null,
    }));
}

export async function getLikedMusic(
  accessToken: string,
  options: { fetchImpl?: typeof fetch } = {},
): Promise<TrackRef[]> {
  const { fetchImpl = fetch } = options;
  const params = new URLSearchParams({
    myRating: "like",
    part: "snippet,contentDetails,status",
    maxResults: "50",
  });
  const response = await fetchImpl(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw await errorFromResponse("youtube", response);
  }
  return parseLikedVideos(await response.json());
}

export const youtubeSource: MusicSourceAdapter = {
  id: "youtube",
  isConfigured: () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  isConnected: async (userId) => {
    const linked = await findLinkedAccount(userId, "google");
    return linked !== null && hasScope(linked.scope, YOUTUBE_SCOPE);
  },
  fetchTracks: async ({ userId }) => getLikedMusic(await accessTokenFor(userId, "youtube")),
  experimental: true,
};

import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { importPKCS8, SignJWT } from "jose";
import { z } from "zod";
import type { TrackRef } from "#/lib/domain.ts";
import { db } from "#/server/db/client.ts";
import { musicConnection } from "#/server/db/schema.ts";
import { env } from "#/server/env.ts";
import {
  errorFromResponse,
  HTTP_TIMEOUT_MS,
  MusicProviderError,
  type MusicSourceAdapter,
} from "./types.ts";

const API = "https://api.music.apple.com/v1";
const TOKEN_TTL_SECONDS = 12 * 3600;

export function appleMusicConfigured(): boolean {
  return Boolean(env.APPLE_MUSIC_TEAM_ID && env.APPLE_MUSIC_KEY_ID && env.APPLE_MUSIC_PRIVATE_KEY);
}

export type DeveloperTokenConfig = {
  teamId: string;
  keyId: string;
  /** PKCS#8 PEM of the MusicKit .p8 key. */
  privateKey: string;
  origin: string;
};

/**
 * Signs a MusicKit developer token: an ES256 JWT, valid for 12 hours, limited to our own origin
 * so it is useless if copied out of the browser. Apple allows at most six months.
 */
export async function signDeveloperToken(
  config: DeveloperTokenConfig,
  now = Date.now(),
): Promise<{ value: string; expiresAt: number }> {
  const key = await importPKCS8(config.privateKey.replaceAll("\\n", "\n"), "ES256");
  const issuedAt = Math.floor(now / 1000);
  const value = await new SignJWT({ origin: [config.origin] })
    .setProtectedHeader({ alg: "ES256", kid: config.keyId })
    .setIssuer(config.teamId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + TOKEN_TTL_SECONDS)
    .sign(key);
  return { value, expiresAt: (issuedAt + TOKEN_TTL_SECONDS) * 1000 };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function developerToken(now = Date.now()): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - now > 60 * 60_000) {
    return cachedToken.value;
  }
  const { APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, APPLE_MUSIC_PRIVATE_KEY } = env;
  if (!(APPLE_MUSIC_TEAM_ID && APPLE_MUSIC_KEY_ID && APPLE_MUSIC_PRIVATE_KEY)) {
    throw new MusicProviderError("Apple Music is not configured", {
      provider: "apple-music",
      code: "unavailable",
      status: 500,
    });
  }
  cachedToken = await signDeveloperToken(
    {
      teamId: APPLE_MUSIC_TEAM_ID,
      keyId: APPLE_MUSIC_KEY_ID,
      privateKey: APPLE_MUSIC_PRIVATE_KEY,
      origin: new URL(env.BETTER_AUTH_URL).origin,
    },
    now,
  );
  return cachedToken.value;
}

export async function saveMusicUserToken(userId: string, token: string): Promise<void> {
  const encrypted = await symmetricEncrypt({ key: env.BETTER_AUTH_SECRET, data: token });
  await db
    .insert(musicConnection)
    .values({ userId, provider: "apple-music", token: encrypted })
    .onConflictDoUpdate({
      target: [musicConnection.userId, musicConnection.provider],
      set: { token: encrypted, createdAt: new Date() },
    });
}

export async function loadMusicUserToken(userId: string): Promise<string | null> {
  const row = await db.query.musicConnection.findFirst({
    where: and(eq(musicConnection.userId, userId), eq(musicConnection.provider, "apple-music")),
    columns: { token: true },
  });
  return row ? symmetricDecrypt({ key: env.BETTER_AUTH_SECRET, data: row.token }) : null;
}

export async function deleteMusicUserToken(userId: string): Promise<void> {
  await db
    .delete(musicConnection)
    .where(and(eq(musicConnection.userId, userId), eq(musicConnection.provider, "apple-music")));
}

const songsSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      attributes: z
        .looseObject({
          name: z.string(),
          artistName: z.string(),
          durationInMillis: z.number().optional(),
          url: z.string().optional(),
          playParams: z
            .looseObject({ id: z.string(), catalogId: z.string().optional() })
            .optional(),
        })
        .optional(),
    }),
  ),
});

/** Recently played / library songs → catalog tracks MusicKit can queue. */
export function parseAppleSongs(json: unknown): TrackRef[] {
  return songsSchema.parse(json).data.flatMap((song): TrackRef[] => {
    const { attributes } = song;
    // Library-only uploads have no catalog id and can't be streamed via MusicKit on the web.
    const catalogId = song.type === "songs" ? song.id : (attributes?.playParams?.catalogId ?? null);
    if (!(attributes && catalogId)) {
      return [];
    }
    return [
      {
        provider: "apple-music",
        id: catalogId,
        uri: catalogId,
        name: attributes.name,
        artists: [attributes.artistName],
        url: attributes.url ?? `https://music.apple.com/song/${encodeURIComponent(catalogId)}`,
        durationMs: attributes.durationInMillis ?? null,
        streamUrl: null,
        credit: null,
      },
    ];
  });
}

export async function getRecentSongs(
  userToken: string,
  options: { limit?: number; fetchImpl?: typeof fetch } = {},
): Promise<TrackRef[]> {
  const { limit = 30, fetchImpl = fetch } = options;
  const headers = {
    authorization: `Bearer ${await developerToken()}`,
    "music-user-token": userToken,
  };
  const recent = await fetchImpl(
    `${API}/me/recent/played/tracks?types=songs&limit=${Math.min(limit, 30)}`,
    {
      headers,
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    },
  );
  if (!recent.ok) {
    throw await errorFromResponse("apple-music", recent);
  }
  const tracks = parseAppleSongs(await recent.json());
  if (tracks.length >= 10) {
    return tracks;
  }
  // New listeners have little history; top up from their library.
  const library = await fetchImpl(`${API}/me/library/songs?limit=100`, {
    headers,
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  if (!library.ok) {
    return tracks;
  }
  return [...tracks, ...parseAppleSongs(await library.json())];
}

export const appleMusicSource: MusicSourceAdapter = {
  id: "apple-music",
  isConfigured: appleMusicConfigured,
  isConnected: async (userId) => (await loadMusicUserToken(userId)) !== null,
  fetchTracks: async ({ userId, limit }) => {
    const userToken = await loadMusicUserToken(userId);
    if (!userToken) {
      throw new MusicProviderError("Not connected", {
        provider: "apple-music",
        code: "not_connected",
        status: 401,
      });
    }
    return getRecentSongs(userToken, { limit });
  },
  experimental: true,
};

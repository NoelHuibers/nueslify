import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { MUSIC_PROVIDER_IDS, type MusicProviderId } from "#/lib/music.ts";
import { db } from "#/server/db/client.ts";
import { account } from "#/server/db/schema.ts";
import { env } from "#/server/env.ts";
import { AUTH_PROVIDER, accessTokenFor } from "#/server/music/accounts.ts";
import {
  deleteMusicUserToken,
  developerToken,
  loadMusicUserToken,
  saveMusicUserToken,
} from "#/server/music/apple-music.ts";
import {
  forgetMusicCache,
  listMusicSources,
  type MusicSourceStatus,
} from "#/server/music/registry.ts";
import { TIDAL_SCOPES } from "#/server/music/tidal-config.ts";
import { authMiddleware } from "./middleware.ts";

export type MusicSourceView = MusicSourceStatus & {
  /** False when this account is the listener's only way to sign in. */
  canDisconnect: boolean;
};

async function signInMethods(userId: string): Promise<string[]> {
  const rows = await db.query.account.findMany({
    where: eq(account.userId, userId),
    columns: { providerId: true },
  });
  return rows.map((row) => row.providerId);
}

export const getMusicSources = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<MusicSourceView[]> => {
    const [sources, methods] = await Promise.all([
      listMusicSources(context.user.id),
      signInMethods(context.user.id),
    ]);
    return sources.map((source) => {
      const authProvider = AUTH_PROVIDER[source.id];
      return {
        ...source,
        canDisconnect: authProvider ? methods.some((method) => method !== authProvider) : true,
      };
    });
  });

const providerInput = z.object({ provider: z.enum(MUSIC_PROVIDER_IDS) });

export const disconnectMusicSource = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(providerInput)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    if (data.provider === "apple-music") {
      await deleteMusicUserToken(userId);
    }
    const authProvider = AUTH_PROVIDER[data.provider];
    if (authProvider) {
      const methods = await signInMethods(userId);
      if (!methods.some((method) => method !== authProvider)) {
        throw new Error("Set a password first, otherwise you couldn't sign in anymore.");
      }
      await db
        .delete(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, authProvider)));
    }
    forgetMusicCache(userId);
    return { ok: true as const };
  });

export const connectAppleMusic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ musicUserToken: z.string().min(16).max(4096) }))
  .handler(async ({ context, data }) => {
    await saveMusicUserToken(context.user.id, data.musicUserToken);
    forgetMusicCache(context.user.id);
    return { ok: true as const };
  });

export type PlaybackAuth =
  | { provider: "tidal"; clientId: string; accessToken: string; scopes: string[] }
  | { provider: "apple-music"; developerToken: string; musicUserToken: string | null };

const playbackProviders = ["tidal", "apple-music"] as const satisfies readonly MusicProviderId[];

/** Credentials the browser SDKs need to play full tracks for this listener. */
export const getPlaybackAuth = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ provider: z.enum(playbackProviders) }))
  .handler(async ({ context, data }): Promise<PlaybackAuth> => {
    if (data.provider === "tidal") {
      return {
        provider: "tidal",
        clientId: env.TIDAL_CLIENT_ID ?? "",
        accessToken: await accessTokenFor(context.user.id, "tidal"),
        scopes: TIDAL_SCOPES,
      };
    }
    return {
      provider: "apple-music",
      developerToken: await developerToken(),
      musicUserToken: await loadMusicUserToken(context.user.id),
    };
  });

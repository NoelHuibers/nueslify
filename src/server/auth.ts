import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth, type SocialProviders } from "better-auth";
import { type GenericOAuthConfig, genericOAuth } from "better-auth/plugins/generic-oauth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { z } from "zod";
import { deleteUserClipFiles } from "#/server/clips.ts";
import { db } from "#/server/db/client.ts";
import { account, session, user, verification } from "#/server/db/schema.ts";
import { env, spotifyConfigured } from "#/server/env.ts";
import { TIDAL_API, TIDAL_SCOPES } from "#/server/music/tidal-config.ts";

/** Scopes requested from Spotify. Playback happens in Spotify's own embed, so no streaming scopes. */
export const SPOTIFY_SCOPES = ["user-top-read"];

type SpotifyProfile = { id: string; email?: string | null; display_name?: string | null };

function buildSocialProviders(): SocialProviders {
  const providers: SocialProviders = {};
  if (spotifyConfigured && env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
    providers.spotify = {
      clientId: env.SPOTIFY_CLIENT_ID,
      clientSecret: env.SPOTIFY_CLIENT_SECRET,
      scope: SPOTIFY_SCOPES,
      // Since February 2026 Spotify no longer returns `email` to Development Mode apps.
      // Fall back to a stable, non-routable address so sign-in with Spotify keeps working.
      mapProfileToUser: (profile: SpotifyProfile) => ({
        email: profile.email ?? `${profile.id}@spotify.nueslify.invalid`,
        name: profile.display_name ?? "Listener",
      }),
    };
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    // Plain Google sign-in; the YouTube scope is requested only when linking YouTube Music.
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      accessType: "offline",
      prompt: "select_account consent",
    };
  }
  return providers;
}

const tidalProfileSchema = z.object({
  data: z.object({
    id: z.string(),
    attributes: z.looseObject({
      email: z.string().optional(),
      username: z.string().optional(),
      firstName: z.string().optional(),
    }),
  }),
});

/** TIDAL speaks plain OAuth 2.1 (PKCE), wired up through Better Auth's generic OAuth plugin. */
function tidalOAuth(): GenericOAuthConfig[] {
  if (!(env.TIDAL_CLIENT_ID && env.TIDAL_CLIENT_SECRET)) {
    return [];
  }
  return [
    {
      providerId: "tidal",
      name: "TIDAL",
      clientId: env.TIDAL_CLIENT_ID,
      clientSecret: env.TIDAL_CLIENT_SECRET,
      authorizationUrl: "https://login.tidal.com/authorize",
      tokenUrl: "https://auth.tidal.com/v1/oauth2/token",
      scopes: TIDAL_SCOPES,
      pkce: true,
      getUserInfo: async (tokens) => {
        const response = await fetch(`${TIDAL_API}/users/me`, {
          headers: {
            authorization: `Bearer ${tokens.accessToken}`,
            accept: "application/vnd.api+json",
          },
        });
        const parsed = tidalProfileSchema.safeParse(await response.json().catch(() => null));
        if (!(response.ok && parsed.success)) {
          return null;
        }
        const { id, attributes } = parsed.data.data;
        return {
          id,
          email: attributes.email ?? `${id}@tidal.nueslify.invalid`,
          emailVerified: false,
          name: attributes.firstName ?? attributes.username ?? "Listener",
        };
      },
    },
  ];
}

export const auth = betterAuth({
  appName: "Nueslify",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: true,
  },
  socialProviders: buildSocialProviders(),
  user: {
    deleteUser: {
      enabled: true,
      // Database rows cascade; audio files in storage have to be removed explicitly.
      beforeDelete: (doomed) => deleteUserClipFiles(db, doomed.id),
    },
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["spotify", "google", "tidal"],
      // Music accounts often have no (visible) email, so linking can't rely on matching emails.
      allowDifferentEmails: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: env.NODE_ENV === "production" && !env.DISABLE_RATE_LIMIT,
    window: 60,
    max: 100,
  },
  plugins: [genericOAuth({ config: tidalOAuth() }), tanstackStartCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;

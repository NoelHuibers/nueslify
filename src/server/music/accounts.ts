import { and, eq } from "drizzle-orm";
import type { MusicProviderId } from "#/lib/music.ts";

import { auth } from "#/server/auth.ts";
import { db } from "#/server/db/client.ts";
import { account } from "#/server/db/schema.ts";
import { MusicProviderError } from "./types.ts";

/** Better Auth provider ids backing each OAuth-connected music provider. */
export const AUTH_PROVIDER: Partial<Record<MusicProviderId, string>> = {
  spotify: "spotify",
  youtube: "google",
  tidal: "tidal",
};

export async function findLinkedAccount(userId: string, authProviderId: string) {
  return (
    (await db.query.account.findFirst({
      where: and(eq(account.userId, userId), eq(account.providerId, authProviderId)),
      columns: { id: true, scope: true, createdAt: true },
    })) ?? null
  );
}

/** A fresh OAuth access token for one of the listener's linked accounts (refreshed if needed). */
export async function accessTokenFor(userId: string, provider: MusicProviderId): Promise<string> {
  const authProviderId = AUTH_PROVIDER[provider];
  const linked = authProviderId ? await findLinkedAccount(userId, authProviderId) : null;
  if (!linked) {
    throw new MusicProviderError("Not connected", { provider, code: "not_connected", status: 401 });
  }
  try {
    const { accessToken } = await auth.api.getAccessToken({
      body: { accountId: linked.id, userId },
    });
    if (!accessToken) {
      throw new Error("No access token");
    }
    return accessToken;
  } catch (error) {
    if (error instanceof MusicProviderError) {
      throw error;
    }
    // Refresh tokens expire (e.g. after six months on Spotify) or get revoked.
    throw new MusicProviderError(String(error), {
      provider,
      code: "unauthorized",
      status: 401,
      cause: error,
    });
  }
}

const SCOPE_SEPARATOR = /[\s,]+/;

export function hasScope(scopeField: string | null, scope: string): boolean {
  return (scopeField ?? "").split(SCOPE_SEPARATOR).includes(scope);
}

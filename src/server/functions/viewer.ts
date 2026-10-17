import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/server/auth.ts";
import { db } from "#/server/db/client.ts";
import { aiMocked, env, spotifyConfigured } from "#/server/env.ts";
import { loadPreferences } from "#/server/preferences.ts";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  onboarded: boolean;
};

/** The signed-in listener, or `null`. Safe to call from route guards. */
export const getViewer = createServerFn({ method: "GET" }).handler(
  async (): Promise<Viewer | null> => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    if (!session) {
      return null;
    }
    const prefs = await loadPreferences(db, session.user.id);
    return {
      id: session.user.id,
      name: prefs.displayName || session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      onboarded: prefs.onboarded,
    };
  },
);

export type PublicConfig = {
  spotifyEnabled: boolean;
  demoMode: boolean;
};

export const getPublicConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicConfig> => ({
    spotifyEnabled: spotifyConfigured,
    demoMode: aiMocked || env.NEWS_SOURCE === "fixture",
  }),
);

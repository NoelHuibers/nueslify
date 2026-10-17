import type { MusicProviderId } from "#/lib/music.ts";
import { getPlaybackAuth } from "#/server/functions/music.ts";
import { createAppleMusicBackend } from "./apple-music.ts";
import { createSpotifyBackend } from "./spotify.ts";
import { createTidalBackend } from "./tidal.ts";
import type { BackendEvents, PlaybackBackend } from "./types.ts";
import { createYouTubeBackend } from "./youtube.ts";

export type BackendFactory = (
  provider: MusicProviderId,
  events: BackendEvents,
) => PlaybackBackend | null;

/**
 * Picks the client playback plugin for a provider. Streamable catalogues (Audius, Jamendo)
 * return `null`: they play through the show's own <audio> element.
 */
export const createBackend: BackendFactory = (provider, events) => {
  switch (provider) {
    case "spotify":
      return createSpotifyBackend(events);
    case "youtube":
      return createYouTubeBackend(events);
    case "tidal":
      return createTidalBackend(events, async () => {
        const auth = await getPlaybackAuth({ data: { provider: "tidal" } });
        if (auth.provider !== "tidal") {
          throw new Error("Unexpected credentials");
        }
        return auth;
      });
    case "apple-music":
      return createAppleMusicBackend(events, async () => {
        const auth = await getPlaybackAuth({ data: { provider: "apple-music" } });
        if (auth.provider !== "apple-music") {
          throw new Error("Unexpected credentials");
        }
        return auth;
      });
    default:
      return null;
  }
};

export type { BackendEvents, PlaybackBackend } from "./types.ts";

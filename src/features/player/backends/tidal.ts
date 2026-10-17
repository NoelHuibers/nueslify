import type { PlaybackAuth } from "#/server/functions/music.ts";
import type { BackendEvents, PlaybackBackend } from "./types.ts";

type TidalPlayer = typeof import("@tidal-music/player");
type FetchAuth = () => Promise<Extract<PlaybackAuth, { provider: "tidal" }>>;

const TOKEN_REUSE_MS = 5 * 60_000;

/**
 * TIDAL's official web player SDK, loaded on demand. Tokens come from our server (which keeps
 * the refresh token), so the browser only ever holds a short-lived access token.
 */
export function createTidalBackend(events: BackendEvents, fetchAuth: FetchAuth): PlaybackBackend {
  let sdk: Promise<TidalPlayer> | null = null;
  let state: "PLAYING" | "NOT_PLAYING" | "IDLE" | "STALLED" = "IDLE";
  let cached: { auth: Awaited<ReturnType<FetchAuth>>; at: number } | null = null;

  async function credentials() {
    if (!cached || Date.now() - cached.at > TOKEN_REUSE_MS) {
      cached = { auth: await fetchAuth(), at: Date.now() };
    }
    const { auth } = cached;
    return {
      clientId: auth.clientId,
      token: auth.accessToken,
      requestedScopes: auth.scopes,
      grantedScopes: auth.scopes,
    };
  }

  function load(): Promise<TidalPlayer> {
    sdk ??= import("@tidal-music/player").then((player) => {
      player.setCredentialsProvider({ bus: () => undefined, getCredentials: credentials });
      player.setEventSender({ sendEvent: () => undefined } as never);
      player.events.addEventListener("playback-state-change", (event) => {
        ({ state } = (event as CustomEvent<{ state: typeof state }>).detail);
        if (state === "PLAYING") {
          events.onState("playing");
        } else if (state === "STALLED") {
          events.onState("buffering");
        } else {
          events.onState("paused");
        }
      });
      player.events.addEventListener("ended", (event) => {
        const { reason } = (event as CustomEvent<{ reason: string }>).detail;
        if (reason === "error") {
          events.onError("TIDAL couldn't play this track.");
        } else {
          events.onEnded();
        }
      });
      return player;
    });
    sdk.catch(() => {
      sdk = null;
    });
    return sdk;
  }

  return {
    provider: "tidal",
    visible: false,
    attach: () => undefined,
    prepare: () => {
      void load();
    },
    async play(track) {
      const player = await load();
      await player.load(
        {
          productId: track.id,
          productType: "track",
          sourceId: "nueslify",
          sourceType: "NUESLIFY_SHOW",
        },
        0,
      );
      await player.play();
    },
    pause() {
      if (state === "PLAYING") {
        void sdk?.then((player) => player.pause());
      }
    },
    toggle() {
      void sdk?.then((player) => (state === "PLAYING" ? player.pause() : player.play()));
    },
    destroy() {
      void sdk?.then((player) => player.reset());
    },
  };
}

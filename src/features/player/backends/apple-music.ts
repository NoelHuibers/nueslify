import type { PlaybackAuth } from "#/server/functions/music.ts";
import type { BackendEvents, BackendStatus, PlaybackBackend } from "./types.ts";
import { loadScript } from "./types.ts";

/** The slice of MusicKit on the Web (v3) that we use. */
export type MusicKitInstance = {
  isAuthorized: boolean;
  authorize: () => Promise<string>;
  setQueue: (options: { song: string; startPlaying?: boolean }) => Promise<unknown>;
  play: () => Promise<unknown>;
  pause: () => void;
  stop: () => void;
  playbackState: number;
  addEventListener: (name: string, callback: (event: { state: number }) => void) => void;
};

type MusicKitGlobal = typeof globalThis & {
  MusicKit?: {
    configure: (config: {
      developerToken: string;
      app: { name: string; build: string };
    }) => Promise<MusicKitInstance>;
    getInstance: () => MusicKitInstance;
    PlaybackStates: Record<string, number>;
  };
};

type FetchAuth = () => Promise<Extract<PlaybackAuth, { provider: "apple-music" }>>;

const SCRIPT = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
// biome-ignore lint/security/noSecrets: a MusicKit event name, not a secret
const STATE_EVENT = "playbackStateDidChange";

const STATE_GROUPS: [BackendStatus | "ended", string[]][] = [
  ["ended", ["completed", "ended"]],
  ["playing", ["playing"]],
  ["paused", ["paused", "stopped"]],
  ["buffering", ["loading", "waiting", "stalled", "seeking"]],
];

/** Maps a MusicKit PlaybackStates value onto our backend vocabulary. */
export function mapPlaybackState(
  state: number,
  states: Record<string, number>,
): BackendStatus | "ended" | null {
  const match = STATE_GROUPS.find(([, names]) => names.some((name) => states[name] === state));
  return match ? match[0] : null;
}
let instancePromise: Promise<MusicKitInstance> | null = null;

/** Loads and configures MusicKit once per page. */
export function loadMusicKit(fetchAuth: FetchAuth): Promise<MusicKitInstance> {
  instancePromise ??= (async () => {
    const global = globalThis as MusicKitGlobal;
    if (!global.MusicKit) {
      const ready = new Promise<void>((resolve) => {
        document.addEventListener("musickitloaded", () => resolve(), { once: true });
      });
      await loadScript(SCRIPT);
      await ready;
    }
    const musicKit = (globalThis as MusicKitGlobal).MusicKit;
    if (!musicKit) {
      throw new Error("MusicKit failed to load.");
    }
    const { developerToken } = await fetchAuth();
    return musicKit.configure({ developerToken, app: { name: "Nueslify", build: "2.0.0" } });
  })();
  instancePromise.catch(() => {
    instancePromise = null;
  });
  return instancePromise;
}

/**
 * Apple Music via MusicKit on the Web. Subscribers hear full songs once they have authorised
 * Nueslify in this browser; everyone else hears 30-second previews.
 */
export function createAppleMusicBackend(
  events: BackendEvents,
  fetchAuth: FetchAuth,
): PlaybackBackend {
  let subscribed = false;

  function music(): Promise<MusicKitInstance> {
    const pending = loadMusicKit(fetchAuth);
    if (!subscribed) {
      subscribed = true;
      void pending.then((instance) => {
        const states = (globalThis as MusicKitGlobal).MusicKit?.PlaybackStates ?? {};
        instance.addEventListener(STATE_EVENT, ({ state }) => {
          const mapped = mapPlaybackState(state, states);
          if (mapped === "ended") {
            events.onEnded();
          } else if (mapped) {
            events.onState(mapped);
          }
        });
      });
    }
    return pending;
  }

  return {
    provider: "apple-music",
    visible: false,
    attach: () => undefined,
    prepare: () => {
      void music();
    },
    async play(track) {
      const instance = await music();
      await instance.setQueue({ song: track.id, startPlaying: true });
    },
    pause() {
      void instancePromise?.then((instance) => instance.pause());
    },
    toggle() {
      void instancePromise?.then((instance) => {
        const playing = (globalThis as MusicKitGlobal).MusicKit?.PlaybackStates["playing"];
        if (instance.playbackState === playing) {
          instance.pause();
        } else {
          void instance.play();
        }
      });
    },
    destroy() {
      void instancePromise?.then((instance) => instance.stop());
    },
  };
}

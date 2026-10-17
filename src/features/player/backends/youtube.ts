import type { BackendEvents, BackendStatus, PlaybackBackend } from "./types.ts";
import { loadScript } from "./types.ts";

/** Minimal typing of the YouTube IFrame Player API we use. */
type YouTubePlayer = {
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
  destroy: () => void;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      width: string | number;
      height: string | number;
      videoId: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
        onError: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
};

type YouTubeGlobal = typeof globalThis & {
  YT?: YouTubeNamespace;
  onYouTubeIframeAPIReady?: () => void;
};

// https://developers.google.com/youtube/iframe_api_reference#Events
const STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;
const STATUS_BY_STATE: Partial<Record<number, BackendStatus>> = {
  [STATE.PLAYING]: "playing",
  [STATE.PAUSED]: "paused",
  [STATE.BUFFERING]: "buffering",
};
const ERRORS: Record<number, string> = {
  2: "YouTube rejected the video id.",
  5: "This video can't be played in an HTML5 player.",
  100: "This video was removed or made private.",
  101: "The uploader doesn't allow this video to be embedded.",
  150: "The uploader doesn't allow this video to be embedded.",
};

let apiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeApi(): Promise<YouTubeNamespace> {
  apiPromise ??= new Promise((resolve, reject) => {
    const global = globalThis as YouTubeGlobal;
    if (global.YT?.Player) {
      resolve(global.YT);
      return;
    }
    global.onYouTubeIframeAPIReady = () => {
      if (global.YT) {
        resolve(global.YT);
      }
    };
    loadScript("https://www.youtube.com/iframe_api").catch((error: unknown) => {
      apiPromise = null;
      reject(error);
    });
  });
  return apiPromise;
}

/**
 * YouTube's embedded player. YouTube's policies require it to stay visible (≥ 200×200 px),
 * with nothing drawn over it, and forbid audio-only background playback.
 */
export function createYouTubeBackend(events: BackendEvents): PlaybackBackend {
  let host: HTMLElement | null = null;
  let player: Promise<YouTubePlayer> | null = null;

  function ensure(videoId: string): Promise<YouTubePlayer> | null {
    if (player) {
      return player;
    }
    if (!host) {
      return null;
    }
    const target = document.createElement("div");
    host.replaceChildren(target);
    player = loadYouTubeApi().then(
      (api) =>
        new Promise<YouTubePlayer>((resolve) => {
          const instance = new api.Player(target, {
            width: "100%",
            height: "100%",
            videoId,
            playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
              onReady: () => resolve(instance),
              onStateChange: ({ data }) => {
                if (data === STATE.ENDED) {
                  events.onEnded();
                  return;
                }
                const status = STATUS_BY_STATE[data];
                if (status) {
                  events.onState(status);
                }
              },
              onError: ({ data }) =>
                events.onError(ERRORS[data] ?? "YouTube couldn't play this video."),
            },
          });
        }),
    );
    player.catch((error: unknown) => {
      player = null;
      events.onError(error instanceof Error ? error.message : String(error));
    });
    return player;
  }

  return {
    provider: "youtube",
    visible: true,
    attach(element) {
      host = element;
      if (!element) {
        void player?.then((instance) => instance.destroy());
        player = null;
      }
    },
    prepare(track) {
      ensure(track.id);
    },
    async play(track) {
      const pending = ensure(track.id);
      if (!pending) {
        events.onError("The YouTube player isn't on screen.");
        return;
      }
      const instance = await pending;
      instance.loadVideoById(track.id);
      instance.playVideo();
    },
    pause() {
      void player?.then((instance) => {
        if (instance.getPlayerState() === STATE.PLAYING) {
          instance.pauseVideo();
        }
      });
    },
    toggle() {
      void player?.then((instance) => {
        if (instance.getPlayerState() === STATE.PLAYING) {
          instance.pauseVideo();
        } else {
          instance.playVideo();
        }
      });
    },
    destroy() {
      void player?.then((instance) => instance.destroy());
      player = null;
    },
  };
}

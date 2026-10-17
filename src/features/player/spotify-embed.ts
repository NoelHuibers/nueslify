/**
 * Typed loader for Spotify's iFrame Embed API.
 * https://developer.spotify.com/documentation/embeds/references/iframe-api
 *
 * Playback happens inside Spotify's own player, which renders Spotify's logo, artwork,
 * metadata and links itself — the compliant way to put Spotify content on a page.
 */

export type EmbedPlaybackUpdate = {
  playingURI: string;
  isPaused: boolean;
  isBuffering: boolean;
  /** milliseconds */
  duration: number;
  /** milliseconds */
  position: number;
};

type EmbedEventMap = {
  ready: undefined;
  playback_started: { playingURI: string };
  playback_update: EmbedPlaybackUpdate;
};

type EmbedListener = <K extends keyof EmbedEventMap>(
  event: K,
  handler: (event: { data: EmbedEventMap[K] }) => void,
) => void;

export type EmbedController = {
  loadUri: (uri: string, preferVideo?: boolean, startAt?: number) => void;
  loadEntity?: (uriOrUrl: string, preferVideo?: boolean, startAt?: number) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  restart: () => void;
  seek: (seconds: number) => void;
  destroy: () => void;
  addListener: EmbedListener;
  removeListener?: EmbedListener;
};

type IFrameApi = {
  createController: (
    element: HTMLElement,
    options: { uri?: string; url?: string; width?: number | string; height?: number | string },
    callback: (controller: EmbedController) => void,
  ) => void;
};

type SpotifyGlobal = typeof globalThis & {
  onSpotifyIframeApiReady?: (api: IFrameApi) => void;
};

const SCRIPT_SRC = "https://open.spotify.com/embed/iframe-api/v1";
let apiPromise: Promise<IFrameApi> | null = null;

export function loadIframeApi(): Promise<IFrameApi> {
  apiPromise ??= new Promise<IFrameApi>((resolve, reject) => {
    (globalThis as SpotifyGlobal).onSpotifyIframeApiReady = resolve;
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Could not load the Spotify player. Is a content blocker active?"));
    };
    document.head.append(script);
  });
  return apiPromise;
}

/** Compact embed: artwork, title, artist, Spotify logo and play button. */
export const EMBED_HEIGHT = 152;

export async function createEmbedController(
  element: HTMLElement,
  uri: string,
): Promise<EmbedController> {
  const api = await loadIframeApi();
  return new Promise((resolve) => {
    api.createController(element, { uri, width: "100%", height: EMBED_HEIGHT }, resolve);
  });
}

export function loadTrack(controller: EmbedController, uri: string): void {
  if (controller.loadEntity) {
    controller.loadEntity(uri);
  } else {
    controller.loadUri(uri);
  }
}

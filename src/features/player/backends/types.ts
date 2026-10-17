import type { TrackRef } from "#/lib/domain.ts";
import type { MusicProviderId } from "#/lib/music.ts";

export type BackendStatus = "playing" | "paused" | "buffering";

export type BackendEvents = {
  onState: (status: BackendStatus) => void;
  /** The current track finished; the show moves on. */
  onEnded: () => void;
  onError: (message: string) => void;
};

/**
 * Client half of a music provider plugin: plays one track at a time in the provider's own
 * player or SDK. Streamable catalogues don't need one — they play through the show's <audio>.
 */
export type PlaybackBackend = {
  readonly provider: MusicProviderId;
  /** Whether the provider's terms require its player to be visible on screen. */
  readonly visible: boolean;
  /** Element to render into (visible backends only); `null` when the dock unmounts. */
  attach: (host: HTMLElement | null) => void;
  /** Optional warm-up, e.g. creating an iframe so the first song starts quickly. */
  prepare: (track: TrackRef) => void;
  play: (track: TrackRef) => Promise<void>;
  pause: () => void;
  toggle: () => void;
  destroy: () => void;
};

export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Could not load ${new URL(src).host}. Is a content blocker active?`));
    document.head.append(script);
  });
}

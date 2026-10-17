import type { TrackRef } from "#/lib/domain.ts";
import { createEmbedController, type EmbedController, loadTrack } from "../spotify-embed.ts";
import { detectTrackEnd, type EmbedProgress, embedStatus } from "../state.ts";
import type { BackendEvents, PlaybackBackend } from "./types.ts";

/**
 * Spotify's iFrame Embed: Spotify renders artwork, metadata and its logo itself, which keeps
 * the integration within Spotify's design guidelines.
 */
export function createSpotifyBackend(events: BackendEvents): PlaybackBackend {
  let host: HTMLElement | null = null;
  let controller: Promise<EmbedController> | null = null;
  let currentUri: string | null = null;
  let progress: EmbedProgress | null = null;
  // Spotify throws if pause() is called before anything was loaded, so track it ourselves.
  let playing = false;

  function ensure(uri: string): Promise<EmbedController> | null {
    if (controller) {
      return controller;
    }
    if (!host) {
      return null;
    }
    const target = document.createElement("div");
    host.replaceChildren(target);
    const pending = createEmbedController(target, uri).then((embed) => {
      embed.addListener("playback_update", ({ data }) => {
        if (data.playingURI && data.playingURI !== currentUri) {
          return;
        }
        playing = !data.isPaused;
        const next: EmbedProgress = {
          isPaused: data.isPaused,
          isBuffering: data.isBuffering,
          position: data.position,
          duration: data.duration,
        };
        const ended = detectTrackEnd(progress, next);
        progress = next;
        if (ended) {
          playing = false;
          events.onEnded();
        } else {
          events.onState(embedStatus(next));
        }
      });
      return embed;
    });
    pending.catch((error: unknown) => {
      if (controller === pending) {
        controller = null;
      }
      events.onError(error instanceof Error ? error.message : String(error));
    });
    controller = pending;
    return pending;
  }

  return {
    provider: "spotify",
    visible: true,
    attach(element) {
      host = element;
      if (!element) {
        void controller?.then((embed) => embed.destroy());
        controller = null;
      }
    },
    prepare(track: TrackRef) {
      ensure(track.uri);
    },
    async play(track) {
      const pending = ensure(track.uri);
      if (!pending) {
        events.onError("The Spotify player isn't on screen.");
        return;
      }
      currentUri = track.uri;
      progress = null;
      const embed = await pending;
      loadTrack(embed, track.uri);
      embed.play();
    },
    pause() {
      if (playing) {
        playing = false;
        void controller?.then((embed) => embed.pause());
      }
    },
    toggle() {
      void controller?.then((embed) => embed.togglePlay());
    },
    destroy() {
      void controller?.then((embed) => embed.destroy());
      controller = null;
      playing = false;
    },
  };
}

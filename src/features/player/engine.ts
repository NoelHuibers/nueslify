import { Store } from "@tanstack/react-store";
import { Timeout } from "#/lib/async.ts";
import type { MusicSegment, Segment, ShowBlock } from "#/lib/domain.ts";
import type { MusicProviderId } from "#/lib/music.ts";
import { silentWavDataUri } from "#/lib/wav.ts";
import { BackendPool } from "./backend-pool.ts";
import type { BackendEvents, BackendFactory } from "./backends/index.ts";
import { AudioLane } from "./host-audio.ts";
import { clearMediaSession, updateMediaSession } from "./media-session.ts";
import {
  addNotice,
  advance,
  appendBlock,
  currentSegment,
  dismissNotice,
  initialPlayerState,
  type PlayerState,
  type PreviousItem,
  previousItem,
  recentTrackIds,
  shouldPrefetch,
} from "./state.ts";

export type FetchBlock = (input: {
  index: number;
  previous: PreviousItem;
  recentTrackIds: string[];
}) => Promise<ShowBlock>;

const AUTOPLAY_GRACE_MS = 6000;
const RETRY_DELAY_MS = 15_000;
const AUDIO_ERROR = "A segment couldn't be played and was skipped.";

/** Host clips, news and directly streamable songs share one <audio> element. */
export function playsInAudioElement(segment: Segment): boolean {
  return segment.kind !== "music" || segment.track.streamUrl !== null;
}

/**
 * Drives a show. Everything that is plain audio — host clips, news, songs from open catalogues —
 * plays through a single <audio> element, so the click that started the show keeps unlocking
 * playback. Songs from other services play through that service's own player or SDK
 * ("backends", one per provider, created on demand).
 */
export class PlayerEngine {
  readonly store = new Store<PlayerState>(initialPlayerState);

  private readonly fetchBlock: FetchBlock;
  private readonly backends: BackendPool;
  private readonly audio: AudioLane;
  private readonly gestureTimeout = new Timeout();
  private readonly retryTimeout = new Timeout();
  private destroyed = false;

  constructor(fetchBlock: FetchBlock, createBackend: BackendFactory) {
    this.fetchBlock = fetchBlock;
    this.backends = new BackendPool(createBackend, (provider) => this.backendEvents(provider));
    const whenCurrent = (action: () => void) => () => {
      if (this.isAudioCurrent()) {
        action();
      }
    };
    this.audio = new AudioLane({
      onState: (status) => whenCurrent(() => this.update((s) => ({ ...s, status })))(),
      onProgress: (position) => this.update((s) => ({ ...s, position })),
      onDuration: (duration) => this.update((s) => ({ ...s, duration })),
      onEnded: whenCurrent(() => this.goTo(this.store.state.current + 1)),
      onError: whenCurrent(() => {
        this.update((s) => addNotice(s, AUDIO_ERROR));
        this.goTo(this.store.state.current + 1);
      }),
    });
  }

  /* ------------------------------ public API ------------------------------ */

  /** Must be called from a user gesture (click / key press). */
  async start(): Promise<void> {
    if (this.store.state.status !== "idle" && this.store.state.status !== "error") {
      return;
    }
    this.audio.unlock(silentWavDataUri());

    this.update((s) => ({ ...s, status: "starting", error: null }));
    if (this.store.state.queue.length > this.store.state.current + 1) {
      this.goTo(this.store.state.current + 1);
      return;
    }
    await this.loadNextBlock();
  }

  toggle(): void {
    const { status } = this.store.state;
    if (status === "idle" || status === "error") {
      void this.start();
      return;
    }
    const segment = currentSegment(this.store.state);
    if (!segment) {
      return;
    }
    if (!playsInAudioElement(segment) && segment.kind === "music") {
      this.backends.get(segment.track.provider)?.toggle();
      return;
    }
    this.audio.toggle(this.markPaused);
  }

  next(): void {
    if (this.store.state.current < 0) {
      return;
    }
    this.stopEverything();
    this.goTo(this.store.state.current + 1);
  }

  /** Restarts the current segment when it plays in our own audio element. */
  replay(): void {
    const segment = currentSegment(this.store.state);
    if (segment && playsInAudioElement(segment)) {
      this.audio.restart();
    }
  }

  retry(): void {
    // A stalled show resumes playback as soon as the block arrives.
    this.update((s) => ({
      ...s,
      error: null,
      status: s.status === "error" ? "starting" : s.status,
    }));
    void this.loadNextBlock();
  }

  dismissNotice(notice: string): void {
    this.update((s) => dismissNotice(s, notice));
  }

  /** The dock's stage, where providers that must stay visible render their players. */
  attachStage(element: HTMLElement | null): void {
    this.backends.attachStage(element);
  }

  /** (Re)activates the engine; pairs with destroy() so StrictMode's double effects are harmless. */
  mount(): void {
    this.destroyed = false;
  }

  destroy(): void {
    this.destroyed = true;
    this.stopEverything();
    this.gestureTimeout.clear();
    this.retryTimeout.clear();
    this.backends.destroyAll();
    this.audio.reset();
    clearMediaSession();
  }

  /* ------------------------------- internals ------------------------------ */

  private update(updater: (state: PlayerState) => PlayerState): void {
    if (!this.destroyed) {
      this.store.setState(updater);
    }
  }

  private async loadNextBlock(): Promise<void> {
    const { state } = this.store;
    if (state.loadingBlock) {
      return;
    }
    this.update((s) => ({ ...s, loadingBlock: true }));
    try {
      const block = await this.fetchBlock({
        index: state.nextBlockIndex,
        previous: previousItem(state),
        recentTrackIds: recentTrackIds(state),
      });
      const waiting = this.store.state.current + 1 >= this.store.state.queue.length;
      this.update((s) => appendBlock(s, block));
      this.warmUp(block);
      if (
        waiting &&
        (this.store.state.status === "starting" || this.store.state.status === "buffering")
      ) {
        this.goTo(this.store.state.current + 1);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn't prepare the next part of the show.";
      const stalled = this.store.state.current + 1 >= this.store.state.queue.length;
      this.update((s) => ({
        ...s,
        loadingBlock: false,
        error: message,
        status: stalled ? "error" : s.status,
      }));
      if (!stalled) {
        this.retryTimeout.set(() => this.maybePrefetch(), RETRY_DELAY_MS);
      }
    }
  }

  private maybePrefetch(): void {
    if (shouldPrefetch(this.store.state)) {
      void this.loadNextBlock();
    }
  }

  private goTo(index: number): void {
    this.gestureTimeout.clear();
    this.update((s) => advance({ ...s, current: index - 1 }));
    const segment = currentSegment(this.store.state);
    if (!segment) {
      this.update((s) => ({ ...s, status: s.status === "error" ? "error" : "buffering" }));
      this.maybePrefetch();
      return;
    }
    updateMediaSession(segment, { toggle: () => this.toggle(), next: () => this.next() });
    if (segment.kind === "music" && !playsInAudioElement(segment)) {
      this.playWithBackend(segment);
    } else {
      this.playInAudioElement(segment);
    }
    this.maybePrefetch();
  }

  private readonly markPaused = () => this.update((s) => ({ ...s, status: "paused" }));

  private isAudioCurrent(): boolean {
    const segment = currentSegment(this.store.state);
    return segment !== null && playsInAudioElement(segment);
  }

  private playInAudioElement(segment: Segment): void {
    this.backends.pauseAll();
    this.audio.play(
      segment.kind === "music" ? (segment.track.streamUrl ?? "") : segment.audioUrl,
      this.markPaused,
    );
  }

  private playWithBackend(segment: MusicSegment): void {
    this.audio.pause();
    const { provider } = segment.track;
    this.backends.pauseAll(provider);
    const backend = this.backends.get(provider);
    if (!backend) {
      this.update((s) => addNotice(s, AUDIO_ERROR));
      this.goTo(this.store.state.current + 1);
      return;
    }
    this.backends.stage.show(backend.visible ? provider : null);
    this.update((s) => ({
      ...s,
      status: "buffering",
      stageProvider: backend.visible ? provider : null,
    }));

    const isCurrent = () => currentSegment(this.store.state)?.id === segment.id;
    backend.play(segment.track).then(
      () => {
        this.gestureTimeout.set(() => {
          if (isCurrent() && this.store.state.status !== "playing") {
            this.update((s) => ({ ...s, musicNeedsGesture: true, status: "paused" }));
          }
        }, AUTOPLAY_GRACE_MS);
      },
      (error: unknown) =>
        this.onBackendError(provider, error instanceof Error ? error.message : String(error)),
    );
  }

  /** Events for a provider's backend, ignored unless that provider is playing right now. */
  private backendEvents(provider: MusicProviderId): BackendEvents {
    const isCurrent = () => {
      const segment = currentSegment(this.store.state);
      return segment?.kind === "music" && segment.track.provider === provider;
    };
    return {
      onState: (status) => {
        if (!isCurrent()) {
          return;
        }
        if (status === "playing") {
          this.gestureTimeout.clear();
        }
        this.update((s) => ({
          ...s,
          status,
          musicNeedsGesture: status === "playing" ? false : s.musicNeedsGesture,
        }));
      },
      onEnded: () => {
        if (isCurrent()) {
          this.goTo(this.store.state.current + 1);
        }
      },
      onError: (message) => this.onBackendError(provider, message, isCurrent()),
    };
  }

  private onBackendError(provider: MusicProviderId, message: string, isCurrent = true): void {
    this.update((s) => addNotice(s, message));
    const segment = currentSegment(this.store.state);
    if (isCurrent && segment?.kind === "music" && segment.track.provider === provider) {
      this.goTo(this.store.state.current + 1);
    }
  }

  /** Creates the first song's player early so it starts without delay. */
  private warmUp(block: ShowBlock): void {
    const firstMusic = block.segments.find(
      (segment): segment is MusicSegment =>
        segment.kind === "music" && !playsInAudioElement(segment),
    );
    if (firstMusic) {
      const backend = this.backends.get(firstMusic.track.provider);
      backend?.prepare(firstMusic.track);
      if (backend?.visible && this.store.state.stageProvider === null) {
        this.backends.stage.show(firstMusic.track.provider);
        this.update((s) => ({ ...s, stageProvider: firstMusic.track.provider }));
      }
    }
  }

  private stopEverything(): void {
    this.audio.pause();
    this.backends.pauseAll();
  }
}

import type { MusicProviderId } from "#/lib/music.ts";
import type { BackendEvents, BackendFactory, PlaybackBackend } from "./backends/index.ts";
import { PlayerStage } from "./stage.ts";

/** Creates provider backends on first use and keeps visible ones mounted on the stage. */
export class BackendPool {
  readonly stage = new PlayerStage();
  private readonly backends = new Map<MusicProviderId, PlaybackBackend | null>();
  private readonly factory: BackendFactory;
  private readonly eventsFor: (provider: MusicProviderId) => BackendEvents;

  constructor(factory: BackendFactory, eventsFor: (provider: MusicProviderId) => BackendEvents) {
    this.factory = factory;
    this.eventsFor = eventsFor;
  }

  get(provider: MusicProviderId): PlaybackBackend | null {
    if (!this.backends.has(provider)) {
      const backend = this.factory(provider, this.eventsFor(provider));
      if (backend?.visible && this.stage.attached) {
        backend.attach(this.stage.slotFor(provider));
      }
      this.backends.set(provider, backend);
    }
    return this.backends.get(provider) ?? null;
  }

  attachStage(element: HTMLElement | null): void {
    this.stage.attach(element);
    for (const backend of this.backends.values()) {
      if (backend?.visible) {
        backend.attach(element ? this.stage.slotFor(backend.provider) : null);
      }
    }
  }

  pauseAll(except?: MusicProviderId): void {
    for (const [provider, backend] of this.backends) {
      if (provider !== except) {
        backend?.pause();
      }
    }
  }

  destroyAll(): void {
    for (const backend of this.backends.values()) {
      backend?.destroy();
    }
    this.backends.clear();
  }
}

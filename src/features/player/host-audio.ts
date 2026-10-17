export type HostAudioHandlers = {
  onState: (status: "playing" | "paused" | "buffering") => void;
  onProgress: (seconds: number) => void;
  onDuration: (seconds: number) => void;
  onEnded: () => void;
  onError: () => void;
};

/**
 * The single <audio> element used for every host and news segment. Reusing one element keeps
 * the autoplay permission granted by the click that started the show (important on iOS).
 */
export function createHostAudio(handlers: HostAudioHandlers): HTMLAudioElement {
  const audio = new Audio();
  audio.preload = "auto";
  audio.addEventListener("play", () => handlers.onState("playing"));
  audio.addEventListener("playing", () => handlers.onState("playing"));
  audio.addEventListener("pause", () => {
    if (!audio.ended) {
      handlers.onState("paused");
    }
  });
  audio.addEventListener("waiting", () => handlers.onState("buffering"));
  audio.addEventListener("timeupdate", () => handlers.onProgress(audio.currentTime));
  audio.addEventListener("durationchange", () =>
    handlers.onDuration(Number.isFinite(audio.duration) ? audio.duration : 0),
  );
  audio.addEventListener("ended", handlers.onEnded);
  audio.addEventListener("error", handlers.onError);
  return audio;
}

/**
 * Lazily created wrapper around the show's single audio element. One element for everything
 * keeps the autoplay permission granted by the click that started the show.
 */
export class AudioLane {
  private element: HTMLAudioElement | null = null;
  private readonly handlers: HostAudioHandlers;

  constructor(handlers: HostAudioHandlers) {
    this.handlers = handlers;
  }

  private get audio(): HTMLAudioElement {
    this.element ??= createHostAudio(this.handlers);
    return this.element;
  }

  /** Must run inside a user gesture: plays a silent clip to unlock audio (iOS/Safari). */
  unlock(silentClip: string): void {
    this.audio.src = silentClip;
    // Don't await: some browsers keep this promise pending, which must not block the show.
    this.audio.play().catch(() => undefined);
  }

  play(src: string, onBlocked: () => void): void {
    this.audio.src = src;
    this.audio.play().catch(onBlocked);
  }

  toggle(onBlocked: () => void): void {
    if (this.audio.paused) {
      this.audio.play().catch(onBlocked);
    } else {
      this.audio.pause();
    }
  }

  restart(): void {
    if (this.element) {
      this.element.currentTime = 0;
      this.element.play().catch(() => undefined);
    }
  }

  pause(): void {
    this.element?.pause();
  }

  reset(): void {
    if (this.element) {
      this.element.removeAttribute("src");
      this.element.load();
    }
  }
}

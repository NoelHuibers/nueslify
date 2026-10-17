/** Minimal stand-in for HTMLAudioElement that lets tests drive playback events by hand. */
export class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];

  src = "";
  preload = "";
  paused = true;
  ended = false;
  currentTime = 0;
  duration = Number.NaN;
  /** Set to make the next play() call reject, like a browser blocking autoplay. */
  rejectNextPlay = false;

  constructor() {
    super();
    FakeAudio.instances.push(this);
  }

  play(): Promise<void> {
    if (this.rejectNextPlay) {
      this.rejectNextPlay = false;
      return Promise.reject(new DOMException("blocked", "NotAllowedError"));
    }
    this.paused = false;
    this.ended = false;
    this.dispatchEvent(new Event("play"));
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  }

  load(): void {
    // no-op
  }

  removeAttribute(name: string): void {
    if (name === "src") {
      this.src = "";
    }
  }

  /** Simulates the clip playing to its end. */
  finish(): void {
    this.ended = true;
    this.paused = true;
    this.dispatchEvent(new Event("ended"));
  }

  fail(): void {
    this.dispatchEvent(new Event("error"));
  }
}

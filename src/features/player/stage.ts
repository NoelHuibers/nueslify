import type { MusicProviderId } from "#/lib/music.ts";

/**
 * The dock area where providers that must stay visible (Spotify, YouTube) render their players.
 * Each provider gets its own slot; only the active one is shown.
 */
export class PlayerStage {
  private host: HTMLElement | null = null;
  private readonly slots = new Map<MusicProviderId, HTMLElement>();

  /** Mounts the stage into the dock (or detaches it with `null`). */
  attach(host: HTMLElement | null): void {
    this.host = host;
    if (host) {
      for (const slot of this.slots.values()) {
        host.append(slot);
      }
    } else {
      this.slots.clear();
    }
  }

  get attached(): boolean {
    return this.host !== null;
  }

  slotFor(provider: MusicProviderId): HTMLElement {
    let slot = this.slots.get(provider);
    if (!slot) {
      slot = document.createElement("div");
      slot.dataset["provider"] = provider;
      slot.className = "size-full";
      slot.hidden = true;
      this.slots.set(provider, slot);
      this.host?.append(slot);
    }
    return slot;
  }

  show(provider: MusicProviderId | null): void {
    for (const [slotProvider, slot] of this.slots) {
      slot.hidden = slotProvider !== provider;
    }
  }
}

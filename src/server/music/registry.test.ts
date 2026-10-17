import { describe, expect, it, vi } from "vitest";
import { chooseSource, type MusicProviderId } from "#/lib/music.ts";
import { makeTrack } from "../../../test/tracks.ts";
import { resolveMusicSource, tracksFor } from "./registry.ts";
import type { MusicSourceAdapter } from "./types.ts";

function adapters(
  state: Partial<Record<MusicProviderId, { configured?: boolean; connected?: boolean }>>,
): Record<MusicProviderId, MusicSourceAdapter> {
  const make = (id: MusicProviderId): MusicSourceAdapter => ({
    id,
    isConfigured: () => state[id]?.configured ?? false,
    isConnected: () => Promise.resolve(state[id]?.connected ?? false),
    fetchTracks: vi.fn(async () => [makeTrack(`${id}-1`, { provider: id })]),
  });
  return {
    spotify: make("spotify"),
    "apple-music": make("apple-music"),
    tidal: make("tidal"),
    youtube: make("youtube"),
    audius: make("audius"),
    jamendo: make("jamendo"),
  };
}

describe("chooseSource", () => {
  const sources = [
    { id: "spotify", configured: true, connected: false },
    { id: "tidal", configured: true, connected: true },
    { id: "audius", configured: true, connected: true },
  ] as const;

  it("honours an explicit, usable choice", () => {
    expect(chooseSource(sources, "audius")).toBe("audius");
  });

  it("falls back to the first connected account, then free catalogues", () => {
    expect(chooseSource(sources, "spotify")).toBe("tidal");
    expect(chooseSource(sources, "auto")).toBe("tidal");
    expect(chooseSource([sources[0], sources[2]], "auto")).toBe("audius");
  });

  it("returns null for news-only shows or when nothing is available", () => {
    expect(chooseSource(sources, "none")).toBeNull();
    expect(chooseSource([sources[0]], "auto")).toBeNull();
  });
});

describe("resolveMusicSource", () => {
  it("ignores providers the server isn't configured for", async () => {
    const sources = adapters({
      spotify: { configured: false, connected: true },
      audius: { configured: true, connected: true },
    });
    expect((await resolveMusicSource("u", "spotify", sources))?.id).toBe("audius");
  });
});

describe("tracksFor", () => {
  it("fetches from the resolved source and caches the result", async () => {
    const sources = adapters({ youtube: { configured: true, connected: true } });
    const request = {
      userId: "cache-user",
      choice: "auto" as const,
      range: "medium_term" as const,
      genres: [],
    };

    const first = await tracksFor(request, sources);
    const second = await tracksFor(request, sources);

    expect(first?.provider).toBe("youtube");
    expect(second?.tracks).toEqual(first?.tracks);
    expect(sources.youtube.fetchTracks).toHaveBeenCalledTimes(1);
  });

  it("returns null when the listener chose no music", async () => {
    const sources = adapters({ audius: { configured: true, connected: true } });
    await expect(
      tracksFor({ userId: "u2", choice: "none", range: "medium_term", genres: [] }, sources),
    ).resolves.toBeNull();
  });
});

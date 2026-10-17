import type { TrackRef } from "#/lib/domain.ts";

/** A Spotify-style track; override `provider`/`streamUrl` etc. as needed. */
export function makeTrack(id: string, overrides: Partial<TrackRef> = {}): TrackRef {
  return {
    provider: "spotify",
    id,
    uri: `spotify:track:${id}`,
    name: `Track ${id}`,
    artists: ["Band"],
    url: `https://open.spotify.com/track/${id}`,
    durationMs: 180_000,
    streamUrl: null,
    credit: null,
    ...overrides,
  };
}

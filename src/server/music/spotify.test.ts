import { describe, expect, it, vi } from "vitest";
import { getTopTracks } from "./spotify.ts";
import { MusicProviderError } from "./types.ts";

const payload = {
  items: [
    {
      id: "1",
      uri: "spotify:track:1",
      name: "One",
      duration_ms: 201_000,
      is_playable: true,
      artists: [{ name: "A" }, { name: "B" }],
      external_urls: { spotify: "https://open.spotify.com/track/1" },
    },
    { id: "2", uri: "spotify:track:2", name: "Two", is_playable: false, artists: [{ name: "C" }] },
    { id: "3", uri: "spotify:track:3", name: "Three", artists: [{ name: "D" }] },
  ],
};

describe("getTopTracks", () => {
  it("maps playable tracks and builds link-back URLs", async () => {
    const fetchMock = vi.fn(async () => Response.json(payload));
    const tracks = await getTopTracks("token", "short_term", { limit: 10, fetchImpl: fetchMock });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10",
      expect.objectContaining({ headers: { authorization: "Bearer token" } }),
    );
    expect(tracks.map((t) => t.id)).toEqual(["1", "3"]);
    expect(tracks[0]).toEqual({
      provider: "spotify",
      id: "1",
      uri: "spotify:track:1",
      name: "One",
      artists: ["A", "B"],
      url: "https://open.spotify.com/track/1",
      durationMs: 201_000,
      streamUrl: null,
      credit: null,
    });
    expect(tracks[1]?.url).toBe("https://open.spotify.com/track/3");
  });

  it("turns API errors into provider errors", async () => {
    const response = Response.json(
      { error: { status: 429, message: "quota", reason: "QUOTA_EXCEEDED" } },
      { status: 429 },
    );
    const error = await getTopTracks("t", "long_term", { fetchImpl: async () => response }).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(MusicProviderError);
    expect(error).toMatchObject({ provider: "spotify", code: "quota_exceeded" });
  });
});

import { describe, expect, it, vi } from "vitest";
import { getCollectionTracks, parseTidalTracks } from "./tidal.ts";

// JSON:API documents shaped like TIDAL API v2 responses.
const tracksDocument = {
  data: [
    {
      id: "75413016",
      type: "tracks",
      attributes: { title: "Kill Jay Z", duration: "PT2M58S" },
      relationships: { artists: { data: [{ id: "1566", type: "artists" }] } },
    },
    {
      id: "2",
      type: "tracks",
      attributes: { title: "Duet", duration: "PT3M" },
      relationships: {
        artists: {
          data: [
            { id: "a", type: "artists" },
            { id: "b", type: "artists" },
          ],
        },
      },
    },
  ],
  included: [
    { id: "1566", type: "artists", attributes: { name: "JAY-Z" } },
    { id: "a", type: "artists", attributes: { name: "Ann" } },
    { id: "b", type: "artists", attributes: { name: "Ben" } },
  ],
};

describe("parseTidalTracks", () => {
  it("joins tracks with their included artists", () => {
    const tracks = parseTidalTracks(tracksDocument);
    expect(tracks[0]).toEqual({
      provider: "tidal",
      id: "75413016",
      uri: "75413016",
      name: "Kill Jay Z",
      artists: ["JAY-Z"],
      url: "https://tidal.com/browse/track/75413016",
      durationMs: 178_000,
      streamUrl: null,
      credit: null,
    });
    expect(tracks[1]?.artists).toEqual(["Ann", "Ben"]);
  });
});

describe("getCollectionTracks", () => {
  it("reads the collection, then fetches the tracks with artists for the user's country", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/userCollectionTracks/me/")) {
        return Response.json({
          data: [
            { id: "75413016", type: "tracks" },
            { id: "2", type: "tracks" },
          ],
        });
      }
      if (url.endsWith("/users/me")) {
        return Response.json({ data: { id: "u1", type: "users", attributes: { country: "DE" } } });
      }
      return Response.json(tracksDocument);
    });

    const tracks = await getCollectionTracks("token", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(tracks).toHaveLength(2);
    const tracksUrl = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
    expect(tracksUrl.pathname).toBe("/v2/tracks");
    expect(tracksUrl.searchParams.getAll("filter[id]")).toEqual(["75413016", "2"]);
    expect(tracksUrl.searchParams.get("countryCode")).toBe("DE");
    expect(tracksUrl.searchParams.get("include")).toBe("artists");
  });

  it("returns nothing for an empty collection without a second request", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/users/me")
        ? Response.json({ data: { id: "u1", type: "users", attributes: {} } })
        : Response.json({ data: [] }),
    );
    await expect(
      getCollectionTracks("token", { fetchImpl: fetchMock as unknown as typeof fetch }),
    ).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, it, vi } from "vitest";
import trending from "../../../test/fixtures/audius-trending.json" with { type: "json" };
import { getTrending, parseAudiusTracks } from "./audius.ts";
import { getPopularTracks, licenseLabel, parseJamendoTracks } from "./jamendo.ts";

describe("Audius", () => {
  it("parses trending tracks into streamable songs with attribution", () => {
    const tracks = parseAudiusTracks(trending, "nueslify");
    expect(tracks).toHaveLength(trending.data.length - 1);
    const [first] = tracks;
    const [raw] = trending.data;
    expect(first).toMatchObject({
      provider: "audius",
      id: raw?.id,
      name: raw?.title,
      artists: [raw?.user.name],
      url: `https://audius.co${raw?.permalink}`,
      streamUrl: `https://api.audius.co/v1/tracks/${raw?.id}/stream?app_name=nueslify`,
      credit: { label: "via Audius", url: `https://audius.co${raw?.permalink}` },
    });
    expect(first?.durationMs).toBe((raw?.duration ?? 0) * 1000);
    expect(tracks.map((t) => t.id)).not.toContain("notStreamable");
  });

  it("queries each chosen genre with Audius' own genre names", async () => {
    const fetchMock = vi.fn(async () => Response.json(trending));
    await getTrending(["hiphop", "lofi"], {
      limit: 10,
      appName: "test",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const genres = fetchMock.mock.calls.map((call) =>
      new URL(String((call as unknown[])[0])).searchParams.get("genre"),
    );
    expect(genres.sort()).toEqual(["Hip-Hop/Rap", "Lo-Fi"]);
  });

  it("falls back to overall trending without genres", async () => {
    const fetchMock = vi.fn(async () => Response.json(trending));
    await getTrending([], { appName: "test", fetchImpl: fetchMock as unknown as typeof fetch });
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.searchParams.has("genre")).toBe(false);
    expect(url.searchParams.get("app_name")).toBe("test");
  });
});

// Shape of GET /v3.0/tracks (Jamendo API) with include=licenses.
const jamendo = {
  headers: { status: "success", results_count: 2 },
  results: [
    {
      id: "1532771",
      name: "Sunny Day",
      duration: 187,
      artist_name: "Indie Artist",
      audio: "https://prod-1.storage.jamendo.com/?trackid=1532771&format=mp32",
      shareurl: "https://www.jamendo.com/track/1532771",
      license_ccurl: "http://creativecommons.org/licenses/by-nc-sa/3.0/",
    },
    { id: "2", name: "No audio", artist_name: "X", audio: "" },
  ],
};

describe("Jamendo", () => {
  it("labels Creative Commons licences", () => {
    expect(licenseLabel("http://creativecommons.org/licenses/by-nc-sa/3.0/")).toBe(
      "CC BY-NC-SA 3.0",
    );
    expect(licenseLabel("https://creativecommons.org/licenses/by/4.0/")).toBe("CC BY 4.0");
    expect(licenseLabel(undefined)).toBe("Creative Commons");
  });

  it("credits the artist, the licence and Jamendo, with a link back", () => {
    expect(parseJamendoTracks(jamendo)).toEqual([
      {
        provider: "jamendo",
        id: "1532771",
        uri: "1532771",
        name: "Sunny Day",
        artists: ["Indie Artist"],
        url: "https://www.jamendo.com/track/1532771",
        durationMs: 187_000,
        streamUrl: "https://prod-1.storage.jamendo.com/?trackid=1532771&format=mp32",
        credit: {
          label: "CC BY-NC-SA 3.0 · via Jamendo",
          url: "https://www.jamendo.com/track/1532771",
        },
      },
    ]);
  });

  it("asks for popular tracks per genre tag", async () => {
    const fetchMock = vi.fn(async () => Response.json(jamendo));
    await getPopularTracks("client-123", ["jazz"], {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]));
    expect(url.origin + url.pathname).toBe("https://api.jamendo.com/v3.0/tracks/");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: "client-123",
      tags: "jazz",
      order: "popularity_week",
      include: "licenses",
    });
  });
});

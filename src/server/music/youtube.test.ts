import { describe, expect, it, vi } from "vitest";
import { getLikedMusic, parseLikedVideos } from "./youtube.ts";

// Shape of videos.list?myRating=like (YouTube Data API v3).
const liked = {
  items: [
    {
      id: "dQw4w9WgXcQ",
      snippet: {
        title: "Never Gonna Give You Up",
        channelTitle: "Rick Astley - Topic",
        categoryId: "10",
      },
      contentDetails: { duration: "PT3M33S" },
      status: { embeddable: true },
    },
    {
      id: "cat-video",
      snippet: { title: "Funny cats", channelTitle: "Cats", categoryId: "15" },
      contentDetails: { duration: "PT1M" },
      status: { embeddable: true },
    },
    {
      id: "no-embed",
      snippet: { title: "Label exclusive", channelTitle: "Label", categoryId: "10" },
      contentDetails: { duration: "PT4M" },
      status: { embeddable: false },
    },
  ],
};

describe("parseLikedVideos", () => {
  it("keeps embeddable music videos and cleans up topic channels", () => {
    expect(parseLikedVideos(liked)).toEqual([
      {
        provider: "youtube",
        id: "dQw4w9WgXcQ",
        uri: "dQw4w9WgXcQ",
        name: "Never Gonna Give You Up",
        artists: ["Rick Astley"],
        url: "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
        durationMs: 213_000,
        streamUrl: null,
        credit: null,
      },
    ]);
  });
});

describe("getLikedMusic", () => {
  it("asks for the listener's likes", async () => {
    const fetchMock = vi.fn(async () => Response.json(liked));
    await getLikedMusic("token", { fetchImpl: fetchMock });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("https://www.googleapis.com/youtube/v3/videos?");
    expect(url).toContain("myRating=like");
    expect(url).toContain("part=snippet%2CcontentDetails%2Cstatus");
    expect(init.headers).toEqual({ authorization: "Bearer token" });
  });

  it("recognises an exhausted Google quota", async () => {
    const response = Response.json(
      { error: { errors: [{ reason: "quotaExceeded" }] } },
      { status: 403 },
    );
    await expect(getLikedMusic("t", { fetchImpl: async () => response })).rejects.toMatchObject({
      provider: "youtube",
      code: "quota_exceeded",
    });
  });
});

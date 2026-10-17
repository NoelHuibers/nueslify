import { describe, expect, it, vi } from "vitest";
import details from "../../../test/fixtures/tagesschau-details.json" with { type: "json" };
import feed from "../../../test/fixtures/tagesschau-feed.json" with { type: "json" };
import {
  ALL_TAGESSCHAU_FEEDS,
  fetchTagesschauBody,
  fetchTagesschauFeed,
  parseDetailsBody,
  parseFeed,
  tagesschauFeed,
} from "./tagesschau.ts";
import { NO_VALIDATORS } from "./types.ts";

describe("parseFeed", () => {
  it("keeps readable stories and drops videos", () => {
    const items = parseFeed(feed, { ressort: "inland" });
    expect(items).toHaveLength(3);
    expect(items.every((item) => item.ressort === "inland" && item.regionId === null)).toBe(true);
    expect(items.every((item) => item.sourceId === "tagesschau" && item.body === null)).toBe(true);
    expect(items.map((item) => item.id)).not.toContain("video-1");
    const [first] = items;
    expect(first?.title).toBe("Winkel als JU-Vorsitzender wiedergewählt");
    expect(first?.publishedAt).toBeInstanceOf(Date);
    expect(first?.shareUrl).toMatch(/^https:\/\/www\.tagesschau\.de\//);
  });

  it("tags regional feeds with their region", () => {
    const items = parseFeed(feed, { regionId: 9 });
    expect(items.every((item) => item.regionId === 9)).toBe(true);
  });

  it("rejects malformed payloads", () => {
    expect(() => parseFeed({ nope: true }, { ressort: "inland" })).toThrow();
  });
});

describe("parseDetailsBody", () => {
  it("joins text and headlines without HTML or broadcast listings", () => {
    const body = parseDetailsBody(details);
    expect(body).toContain("Johannes Winkel ist als Vorsitzender der Jungen Union");
    expect(body).toContain("Frontalangriff auf Schwesig");
    expect(body).not.toMatch(/<[^>]+>/);
    expect(body).not.toContain("Das Erste | tagesthemen");
    expect(body.split("\n\n").length).toBeGreaterThan(5);
  });

  it("returns an empty string when there is no content", () => {
    expect(parseDetailsBody({})).toBe("");
  });
});

describe("tagesschau feeds", () => {
  it("has one feed per section and Bundesland with stable keys", () => {
    expect(ALL_TAGESSCHAU_FEEDS).toHaveLength(22);
    expect(tagesschauFeed({ ressort: "inland" }).key).toBe("tagesschau:ressort:inland");
    expect(tagesschauFeed({ regionId: 3 }).key).toBe("tagesschau:region:3");
  });

  it("requests the api2u feed for a ressort", async () => {
    const fetchMock = vi.fn(async () => Response.json(feed));
    const result = await fetchTagesschauFeed(
      fetchMock,
      tagesschauFeed({ ressort: "inland" }),
      NO_VALIDATORS,
    );
    expect(result.status === "ok" && result.items).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.tagesschau.de/api2u/news/?ressort=inland",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it("requests regional feeds via the regions parameter", async () => {
    const fetchMock = vi.fn(async () => Response.json(feed));
    await fetchTagesschauFeed(fetchMock, tagesschauFeed({ regionId: 3 }), NO_VALIDATORS);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.tagesschau.de/api2u/news/?regions=3",
      expect.anything(),
    );
  });

  it("surfaces HTTP errors", async () => {
    await expect(
      fetchTagesschauFeed(
        async () => new Response("nope", { status: 503 }),
        tagesschauFeed({ ressort: "sport" }),
        NO_VALIDATORS,
      ),
    ).rejects.toThrow(/503/);
  });

  it("refuses to follow details links to other hosts", async () => {
    const fetchMock = vi.fn();
    const [item] = parseFeed(feed, { ressort: "inland" });
    if (!item) {
      throw new Error("fixture has no items");
    }
    await expect(
      fetchTagesschauBody(fetchMock, { ...item, detailsUrl: "https://evil.example/x.json" }),
    ).rejects.toThrow(/unexpected host/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

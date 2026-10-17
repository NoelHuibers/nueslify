import { describe, expect, it } from "vitest";
import { createRandom } from "#/lib/async.ts";
import type { TrackRef } from "#/lib/domain.ts";
import { makeTrack } from "../../../test/tracks.ts";
import { pickStories, pickTracks, planBlock } from "./planner.ts";
import type { RankedStory } from "./ranking.ts";

const minutesAgo = (minutes: number) => new Date(Date.UTC(2026, 9, 16, 12, 0) - minutes * 60_000);

function story(id: string, overrides: Partial<RankedStory> = {}): RankedStory {
  const age = Number(id.replace(/\D/g, "")) || 1;
  return {
    id,
    sourceId: "tagesschau",
    clusterId: id,
    ressort: "inland",
    regionId: null,
    title: `Story ${id}`,
    topline: null,
    breaking: false,
    publishedAt: minutesAgo(age),
    bodyLength: 2000,
    score: 1 / age,
    coverage: 1,
    others: [],
    ...overrides,
  };
}

function track(id: string): TrackRef {
  return makeTrack(id, { name: `Track ${id}`, artists: ["Artist"] });
}

describe("pickStories", () => {
  const candidates = [
    story("i1", { ressort: "inland" }),
    story("i2", { ressort: "inland" }),
    story("a3", { ressort: "ausland" }),
    story("w4", { ressort: "wirtschaft" }),
    story("s5", { ressort: "sport" }),
    story("r6", { ressort: null, regionId: 9 }),
  ];

  it("puts breaking news first", () => {
    const picked = pickStories(
      [...candidates, story("b9", { ressort: "ausland", breaking: true })],
      { categories: ["inland", "ausland"], regionId: null },
      2,
    );
    expect(picked.map((s) => s.id)).toEqual(["b9", "i1"]);
  });

  it("round-robins region and categories", () => {
    const picked = pickStories(candidates, { categories: ["inland", "ausland"], regionId: 9 }, 3);
    expect(picked.map((s) => s.id)).toEqual(["r6", "i1", "a3"]);
  });

  it("rotates which category leads each block", () => {
    const prefs = { categories: ["inland", "ausland", "wirtschaft"] as const, regionId: null };
    expect(
      pickStories(candidates, { ...prefs, categories: [...prefs.categories] }, 1, 0)[0]?.id,
    ).toBe("i1");
    expect(
      pickStories(candidates, { ...prefs, categories: [...prefs.categories] }, 1, 1)[0]?.id,
    ).toBe("a3");
    expect(
      pickStories(candidates, { ...prefs, categories: [...prefs.categories] }, 1, 2)[0]?.id,
    ).toBe("w4");
  });

  it("prefers widely covered events over merely newer ones", () => {
    const picked = pickStories(
      [...candidates, story("i7", { score: 3, coverage: 5 })],
      { categories: ["inland"], regionId: null },
      1,
    );
    expect(picked.map((s) => s.id)).toEqual(["i7"]);
  });

  it("gives another outlet a turn before repeating one", () => {
    const picked = pickStories(
      [story("i1"), story("i2"), story("i3", { sourceId: "spiegel" })],
      { categories: ["inland"], regionId: null },
      2,
    );
    expect(picked.map((s) => s.id)).toEqual(["i1", "i3"]);
  });

  it("fills up with other fresh stories on a quiet day", () => {
    const picked = pickStories(candidates, { categories: ["wissen"], regionId: null }, 2);
    expect(picked).toHaveLength(2);
  });

  it("returns nothing for a count of zero", () => {
    expect(pickStories(candidates, { categories: [], regionId: null }, 0)).toEqual([]);
  });
});

describe("pickTracks", () => {
  const library = ["a", "b", "c", "d", "e"].map(track);

  it("avoids recently played songs", () => {
    const picked = pickTracks(library, new Set(["a", "b"]), 3, createRandom(1));
    expect(picked).toHaveLength(3);
    expect(picked.map((t) => t.id).sort()).toEqual(["c", "d", "e"]);
  });

  it("falls back to the whole library when everything was played", () => {
    const picked = pickTracks(library, new Set(["a", "b", "c", "d", "e"]), 2, createRandom(1));
    expect(picked).toHaveLength(2);
  });

  it("handles empty libraries", () => {
    expect(pickTracks([], new Set(), 3)).toEqual([]);
  });
});

describe("planBlock", () => {
  const tracks = [track("a"), track("b")];
  const stories = [story("i1"), story("a3", { ressort: "ausland" })];

  it("opens the show, plays songs, bridges into the news", () => {
    const plan = planBlock({
      index: 0,
      tracks,
      stories,
      previous: { kind: "nothing" },
      mentionTracks: true,
    });
    expect(plan.map((s) => (s.kind === "host" ? `host:${s.role}` : s.kind))).toEqual([
      "host:intro",
      "music",
      "music",
      "host:bridge",
      "news",
      "news",
    ]);
    const [intro] = plan;
    expect(intro?.kind === "host" && intro.to).toEqual({
      kind: "track",
      name: "Track a",
      artists: ["Artist"],
    });
  });

  it("bridges from the previous block", () => {
    const previous = { kind: "story", title: "Old", topline: null } as const;
    const [first] = planBlock({ index: 3, tracks, stories, previous, mentionTracks: true });
    expect(first).toMatchObject({ kind: "host", role: "bridge", from: previous });
  });

  it("never names songs when the listener opted out", () => {
    const plan = planBlock({
      index: 0,
      tracks,
      stories,
      previous: { kind: "nothing" },
      mentionTracks: false,
    });
    for (const segment of plan) {
      if (segment.kind === "host") {
        expect(segment.to.kind).not.toBe("track");
        expect(segment.from.kind).not.toBe("track");
      }
    }
  });

  it("makes a news-only block without music", () => {
    const plan = planBlock({
      index: 1,
      tracks: [],
      stories,
      previous: { kind: "nothing" },
      mentionTracks: true,
    });
    expect(plan.map((s) => s.kind)).toEqual(["host", "news", "news"]);
  });

  it("is empty when there is nothing to play", () => {
    expect(
      planBlock({
        index: 0,
        tracks: [],
        stories: [],
        previous: { kind: "nothing" },
        mentionTracks: true,
      }),
    ).toEqual([]);
  });
});

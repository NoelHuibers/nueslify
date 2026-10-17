import { describe, expect, it } from "vitest";
import type { Segment, ShowBlock } from "#/lib/domain.ts";
import { makeTrack } from "../../../test/tracks.ts";
import {
  addNotice,
  advance,
  appendBlock,
  currentSegment,
  detectTrackEnd,
  embedStatus,
  initialPlayerState,
  type PlayerState,
  previousItem,
  recentTrackIds,
  shouldPrefetch,
  upcomingSegments,
} from "./state.ts";

const host = (id: string): Segment => ({
  id,
  kind: "host",
  role: "bridge",
  audioUrl: `/a/${id}`,
  transcript: id,
});
const music = (id: string): Segment => ({
  id,
  kind: "music",
  track: makeTrack(id, { name: `Song ${id}` }),
});
const news = (id: string): Segment => ({
  id,
  kind: "news",
  audioUrl: `/a/${id}`,
  transcript: id,
  story: {
    id,
    title: `Story ${id}`,
    topline: "Topic",
    ressort: "inland",
    regionId: null,
    shareUrl: "https://www.tagesschau.de",
    sourceId: "tagesschau",
    alsoReportedBy: [],
    publishedAt: "2026-10-16T10:00:00Z",
  },
});

const block = (index: number, segments: Segment[], notices: string[] = []): ShowBlock => ({
  index,
  segments,
  notices,
});

describe("queue handling", () => {
  it("appends blocks and advances through them", () => {
    let state: PlayerState = appendBlock(
      { ...initialPlayerState, status: "playing", loadingBlock: true },
      block(0, [host("h1"), music("m1"), news("n1")]),
    );
    expect(state.loadingBlock).toBe(false);
    expect(state.nextBlockIndex).toBe(1);
    expect(currentSegment(state)).toBeNull();

    state = advance(state);
    expect(currentSegment(state)?.id).toBe("h1");
    expect(upcomingSegments(state).map((s) => s.id)).toEqual(["m1", "n1"]);
  });

  it("deduplicates notices and keeps the latest three", () => {
    let state = appendBlock(initialPlayerState, block(0, [], ["a", "b"]));
    state = appendBlock(state, block(1, [], ["b", "c", "d"]));
    expect(state.notices).toEqual(["b", "c", "d"]);
    expect(addNotice(state, "b").notices).toEqual(["c", "d", "b"]);
  });
});

describe("shouldPrefetch", () => {
  const base = appendBlock(
    { ...initialPlayerState, status: "playing" },
    block(0, [host("1"), host("2"), host("3"), host("4")]),
  );

  it("prefetches when the queue runs low", () => {
    expect(shouldPrefetch({ ...base, current: 0 })).toBe(false);
    expect(shouldPrefetch({ ...base, current: 1 })).toBe(true);
  });

  it("never prefetches while idle, failed or already loading", () => {
    expect(shouldPrefetch({ ...base, current: 3, status: "idle" })).toBe(false);
    expect(shouldPrefetch({ ...base, current: 3, status: "error" })).toBe(false);
    expect(shouldPrefetch({ ...base, current: 3, loadingBlock: true })).toBe(false);
  });
});

describe("context for the next block", () => {
  it("bridges from the last queued item", () => {
    const withMusic = appendBlock(initialPlayerState, block(0, [host("h"), music("m1")]));
    expect(previousItem(withMusic)).toEqual({ kind: "track", name: "Song m1", artists: ["Band"] });

    const withNews = appendBlock(initialPlayerState, block(0, [news("n1")]));
    expect(previousItem(withNews)).toEqual({ kind: "story", title: "Story n1", topline: "Topic" });

    expect(previousItem(initialPlayerState)).toEqual({ kind: "nothing" });
  });

  it("collects recently queued track ids", () => {
    const state = appendBlock(initialPlayerState, block(0, [music("a"), host("h"), music("b")]));
    expect(recentTrackIds(state)).toEqual(["a", "b"]);
  });
});

describe("Spotify embed progress", () => {
  const playing = { isPaused: false, isBuffering: false, position: 10_000, duration: 200_000 };

  it("does not end mid-song or on a user pause", () => {
    expect(detectTrackEnd(null, playing)).toBe(false);
    expect(detectTrackEnd(playing, { ...playing, position: 11_000 })).toBe(false);
    expect(detectTrackEnd(playing, { ...playing, isPaused: true })).toBe(false);
  });

  it("ends when the track reaches its end and stops", () => {
    const nearEnd = { ...playing, position: 199_500 };
    expect(detectTrackEnd(nearEnd, { ...nearEnd, position: 200_000, isPaused: true })).toBe(true);
  });

  it("ends when the player resets to the start after the last second", () => {
    const nearEnd = { ...playing, position: 199_200 };
    expect(detectTrackEnd(nearEnd, { ...playing, position: 0 })).toBe(true);
  });

  it("detects the end the way the real embed reports it (position === duration, still playing)", () => {
    // Recorded from open.spotify.com/embed/iframe-api/v1 for a 30 s preview.
    const updates = [27_475, 28_538, 29_598, 29_713].map((position) => ({
      isPaused: false,
      isBuffering: false,
      position,
      duration: 29_713,
    }));
    const ends = updates.map((update, i) => detectTrackEnd(updates[i - 1] ?? null, update));
    expect(ends).toEqual([false, false, false, true]);
  });

  it("handles 30 second previews", () => {
    const preview = { isPaused: false, isBuffering: false, position: 29_000, duration: 30_000 };
    expect(detectTrackEnd(preview, { ...preview, position: 30_000, isPaused: true })).toBe(true);
  });

  it("maps embed state to player status", () => {
    expect(embedStatus({ isPaused: false, isBuffering: true })).toBe("buffering");
    expect(embedStatus({ isPaused: true, isBuffering: false })).toBe("paused");
    expect(embedStatus({ isPaused: false, isBuffering: false })).toBe("playing");
  });
});

import { describe, expect, it } from "vitest";
import { describeBalance, segmentCounts } from "./mix.ts";

describe("segmentCounts", () => {
  it.each([
    [0, true, { tracks: 0, stories: 3 }],
    [20, true, { tracks: 1, stories: 2 }],
    [50, true, { tracks: 3, stories: 2 }],
    [80, true, { tracks: 4, stories: 1 }],
    [100, true, { tracks: 5, stories: 0 }],
  ])("balance %i with music → %o", (balance, music, expected) => {
    expect(segmentCounts(balance, music)).toEqual(expected);
  });

  it("falls back to a news block when no music is available", () => {
    expect(segmentCounts(100, false)).toEqual({ tracks: 0, stories: 2 });
    expect(segmentCounts(50, false)).toEqual({ tracks: 0, stories: 2 });
    expect(segmentCounts(0, false)).toEqual({ tracks: 0, stories: 3 });
  });
});

describe("describeBalance", () => {
  it("summarises a block in words", () => {
    expect(describeBalance(50, true)).toBe("About 3 songs and 2 stories between host breaks");
    expect(describeBalance(20, true)).toBe("About 1 song and 2 stories between host breaks");
    expect(describeBalance(100, true)).toBe("About 5 songs between host breaks");
  });
});

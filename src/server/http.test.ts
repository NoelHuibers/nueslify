import { describe, expect, it } from "vitest";
import { audioContentType, parseRange, safeEqual } from "./http.ts";

describe("parseRange", () => {
  it("returns null without a header", () => {
    expect(parseRange(null, 100)).toBeNull();
  });

  it.each([
    ["bytes=0-9", { start: 0, end: 9 }],
    ["bytes=10-", { start: 10, end: 99 }],
    ["bytes=-10", { start: 90, end: 99 }],
    ["bytes=50-500", { start: 50, end: 99 }],
  ])("%s", (header, expected) => {
    expect(parseRange(header, 100)).toEqual(expected);
  });

  it.each(["bytes=", "bytes=100-", "bytes=9-1", "items=0-1", "bytes=0-1,5-6"])(
    "%s is invalid",
    (header) => {
      expect(parseRange(header, 100)).toBe("invalid");
    },
  );
});

describe("safeEqual", () => {
  it("compares strings", () => {
    expect(safeEqual("Bearer abc", "Bearer abc")).toBe(true);
    expect(safeEqual("Bearer abc", "Bearer abd")).toBe(false);
    expect(safeEqual("short", "longer string")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("audioContentType", () => {
  it("maps extensions", () => {
    expect(audioContentType("clips/a.wav")).toBe("audio/wav");
    expect(audioContentType("clips/a.mp3")).toBe("audio/mpeg");
  });
});

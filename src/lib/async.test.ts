import { describe, expect, it } from "vitest";
import { chunk, createRandom, mapWithConcurrency, shuffle } from "./async.ts";

describe("mapWithConcurrency", () => {
  it("preserves order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const result = await mapWithConcurrency([5, 1, 4, 2, 3], 2, async (value) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, value));
      inFlight -= 1;
      return value * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });

  it("handles empty input", async () => {
    await expect(mapWithConcurrency([], 4, async () => 1)).resolves.toEqual([]);
  });
});

describe("chunk", () => {
  it("splits into fixed-size batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });
});

describe("createRandom / shuffle", () => {
  it("is deterministic for a seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("produces values in [0, 1)", () => {
    const random = createRandom(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("returns a permutation without mutating the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const output = shuffle(input, createRandom(1));
    expect(output).toHaveLength(input.length);
    expect([...output].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

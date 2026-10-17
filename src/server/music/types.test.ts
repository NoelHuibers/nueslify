import { describe, expect, it } from "vitest";
import {
  describeMusicError,
  errorFromResponse,
  isoDurationToMs,
  MusicProviderError,
} from "./types.ts";

describe("isoDurationToMs", () => {
  it.each([
    ["PT3M12S", 192_000],
    ["PT1H2M3S", 3_723_000],
    ["PT45S", 45_000],
    ["PT2M58.5S", 178_500],
    ["P1DT1S", 86_401_000],
  ])("%s → %i ms", (value, expected) => {
    expect(isoDurationToMs(value)).toBe(expected);
  });

  it("returns null for missing or malformed values", () => {
    expect(isoDurationToMs(undefined)).toBeNull();
    expect(isoDurationToMs("3:12")).toBeNull();
  });
});

describe("errorFromResponse", () => {
  it.each([
    [401, {}, "unauthorized"],
    [403, {}, "forbidden"],
    [403, { error: { errors: [{ reason: "quotaExceeded" }] } }, "quota_exceeded"],
    [429, { error: { reason: "QUOTA_EXCEEDED" } }, "quota_exceeded"],
    [429, {}, "rate_limited"],
    [503, {}, "unavailable"],
  ] as const)("maps %i %o to %s", async (status, body, code) => {
    const error = await errorFromResponse(
      "youtube",
      Response.json(body, { status, headers: { "retry-after": "7" } }),
    );
    expect(error).toBeInstanceOf(MusicProviderError);
    expect(error).toMatchObject({ provider: "youtube", code, status, retryAfterSeconds: 7 });
  });
});

describe("describeMusicError", () => {
  it("names the provider", () => {
    const error = new MusicProviderError("x", {
      provider: "tidal",
      code: "unauthorized",
      status: 401,
    });
    expect(describeMusicError(error)).toBe(
      "Your TIDAL connection expired. Reconnect it in Settings to hear music again.",
    );
  });
});

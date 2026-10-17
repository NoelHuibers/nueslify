import { describe, expect, it } from "vitest";
import { sanitizeForSpeech } from "./sanitize.ts";

describe("sanitizeForSpeech", () => {
  it("removes stage directions in all their forms", () => {
    const input =
      "*upbeat jingle* Good morning, Ada! [music fades] It's a great day (laughs) for the news.";
    expect(sanitizeForSpeech(input)).toBe("Good morning, Ada! It's a great day for the news.");
  });

  it("keeps longer parentheticals that are actual content", () => {
    const input = "The deal (worth more than two billion euros in total) was signed.";
    expect(sanitizeForSpeech(input)).toBe(input);
  });

  it("drops speaker labels, markdown and emoji", () => {
    expect(sanitizeForSpeech("News-lee-fy: **Hello** there! 🎶\n- one\n# Heading")).toBe(
      "Hello there!\none\nHeading",
    );
  });

  it("unwraps a fully quoted answer", () => {
    expect(sanitizeForSpeech('"Welcome back to the show."')).toBe("Welcome back to the show.");
  });

  it("truncates at a sentence boundary", () => {
    const text = `${"First sentence is fine. ".repeat(5)}This one is cut.`;
    const result = sanitizeForSpeech(text, 80);
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith(".")).toBe(true);
  });
});

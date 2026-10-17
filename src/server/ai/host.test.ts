import { describe, expect, it } from "vitest";
import { mockDurationMs, mockScript, synthesize, writeScript } from "./host.ts";
import type { ListenerContext } from "./prompts.ts";

const listener: ListenerContext = {
  name: "Ada",
  language: "en",
  hostStyle: "friendly",
  regionName: null,
  now: new Date("2026-10-16T16:00:00Z"),
};

describe("mock host (AI_MOCK=true)", () => {
  it("writes a greeting that names the listener and the first item", async () => {
    const script = await writeScript(
      { kind: "intro", next: { kind: "track", name: "Song", artists: ["Band"] } },
      listener,
      "openai",
    );
    expect(script).toBe(
      'Good evening, Ada! This is News-lee-fy, your very own radio station. Let\'s kick things off with the song "Song" by Band.',
    );
  });

  it("speaks German when asked to", () => {
    const script = mockScript(
      {
        kind: "bridge",
        from: { kind: "nothing" },
        to: { kind: "story", title: "X", topline: null },
      },
      { ...listener, language: "de" },
    );
    expect(script).toMatch(/^Das war/);
  });

  it("summarises news from the first sentences", () => {
    const script = mockScript(
      {
        kind: "news",
        story: {
          source: "tagesschau",
          title: "Titel",
          topline: null,
          body: "Satz eins. Satz zwei! Satz drei.",
          fullArticle: true,
          ressort: null,
          regionName: null,
          others: [],
        },
      },
      listener,
    );
    expect(script).toBe("Titel. Satz eins. Satz zwei! That's according to tagesschau.");
  });

  it("credits every outlet that reported the story", () => {
    const script = mockScript(
      {
        kind: "news",
        story: {
          source: "BBC News",
          title: "Title",
          topline: null,
          body: "One. Two.",
          fullArticle: false,
          ressort: null,
          regionName: null,
          others: [
            { source: "DER SPIEGEL", title: "Titel", teaser: null },
            { source: "taz", title: "Titel", teaser: null },
          ],
        },
      },
      listener,
    );
    expect(script).toBe(
      "Title. One. Two. That's according to BBC News. DER SPIEGEL and taz reported it too.",
    );
  });

  it("synthesizes a short silent WAV", async () => {
    const result = await synthesize("Hello there", {
      voice: "fable",
      style: "friendly",
      language: "en",
    });
    expect(result.mimeType).toBe("audio/wav");
    expect(result.extension).toBe("wav");
    expect(new TextDecoder().decode(result.audio.slice(0, 4))).toBe("RIFF");
    expect(result.audio.byteLength).toBeGreaterThan(44);
  });

  it("keeps mock audio short", () => {
    expect(mockDurationMs("")).toBe(1500);
    expect(mockDurationMs("x".repeat(10_000))).toBe(6000);
  });
});

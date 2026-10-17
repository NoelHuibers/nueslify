import { describe, expect, it } from "vitest";
import { decodeEntities, htmlToText, isBroadcastReference, truncateText } from "./text.ts";

describe("decodeEntities", () => {
  it("decodes named, decimal and hex entities", () => {
    expect(decodeEntities("Fu&szlig;ball &amp; M&uuml;nchen &#8364; &#x201E;Hallo&ldquo;")).toBe(
      "Fußball & München € „Hallo“",
    );
  });

  it("leaves unknown entities alone", () => {
    expect(decodeEntities("&unknown; stays")).toBe("&unknown; stays");
  });
});

describe("htmlToText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(htmlToText("<h2>Merz  für</h2>\n<strong>Samstag</strong> erwartet")).toBe(
      "Merz für Samstag erwartet",
    );
  });
});

describe("isBroadcastReference", () => {
  it("detects programme listings", () => {
    expect(isBroadcastReference("Das Erste | tagesthemen | 16.10.2026 | 21:45 Uhr")).toBe(true);
    expect(isBroadcastReference("Ein ganz normaler Satz.")).toBe(false);
  });
});

describe("truncateText", () => {
  it("keeps short text untouched", () => {
    expect(truncateText("Kurz.", 100)).toBe("Kurz.");
  });

  it("cuts at a sentence boundary", () => {
    const text = "Erster Satz ist hier. Zweiter Satz folgt jetzt. Dritter Satz ist zu lang.";
    expect(truncateText(text, 50)).toBe("Erster Satz ist hier. Zweiter Satz folgt jetzt.");
  });
});

import { describe, expect, it } from "vitest";
import { canonicalUrl, inferCategory, isReadable, splitKicker } from "./classify.ts";

describe("inferCategory", () => {
  it.each([
    ["https://www.spiegel.de/politik/deutschland/frei-zuckersteuer-a-1", [], "inland"],
    ["https://www.faz.net/aktuell/politik/inland/liveticker-1.html", [], "inland"],
    ["https://www.handelsblatt.com/politik/international/us-wahlen/1.html", [], "ausland"],
    ["https://www.spiegel.de/sport/fussball/bundesliga-frankfurt-a-1", [], "sport"],
    ["https://www.welt.de/wissenschaft/article1/elefant.html", [], "wissen"],
    ["https://www.theguardian.com/technology/2026/oct/14/ai", [], "wissen"],
    ["https://www.aljazeera.com/economy/2026/10/17/imf", [], "wirtschaft"],
    ["https://www.theguardian.com/global-development/x", ["Senegal", "World news"], "ausland"],
    ["https://rss.dw.com/a-1", ["Deutschland"], "inland"],
  ] as const)("%s → %s", (url, categories, expected) => {
    expect(inferCategory(url, categories, null)).toBe(expected);
  });

  it("falls back when nothing matches", () => {
    expect(inferCategory("https://taz.de/Gemeinschaft-im-Alter/!6218159/", [], null)).toBeNull();
    expect(inferCategory("https://www.bbc.co.uk/news/articles/c1", [], "ausland")).toBe("ausland");
  });
});

describe("isReadable", () => {
  const entry = (title: string, url: string, categories: string[] = []) =>
    isReadable({ title, url, categories });

  it("keeps ordinary news", () => {
    expect(entry("Trump stoppt Zölle", "https://www.n-tv.de/politik/Trump-id1.html")).toBe(true);
    expect(entry("Live music returns", "https://www.bbc.co.uk/news/articles/c1")).toBe(true);
  });

  it.each([
    ["Clip", "https://www.welt.de/videos/video1/kanzler.html"],
    ["Clip", "https://www.france24.com/en/video/20261017-x"],
    ["Ticker", "https://www.dw.com/en/india-news/live-79685143"],
    ["Ticker", "https://www.faz.net/aktuell/politik/inland/liveticker-bundespolitik-1.html"],
    ["Opinion", "https://www.handelsblatt.com/meinung/kommentare/x/1.html"],
    ["Opinion", "https://www.theguardian.com/commentisfree/2026/oct/1/x"],
    ["Liveblog Ukrainekrieg: Neues", "https://www.faz.net/aktuell/politik/ukraine/x.html"],
    ["+++ Ukraine-Krieg +++: Neues", "https://www.handelsblatt.com/politik/x/1.html"],
    ["Newsblog zu den Landtagswahlen: X", "https://www.sueddeutsche.de/politik/x"],
    ["Watch: Will Ukraine get support?", "https://www.bbc.co.uk/news/videos/c1"],
    ["KOMMENTAR - Das Bashing der Superreichen", "https://www.nzz.ch/wirtschaft/x"],
  ])("drops %s (%s)", (title, url) => {
    expect(entry(title, url)).toBe(false);
  });

  it("drops satire and video categories", () => {
    expect(entry("CDU-Verbot", "https://www.welt.de/x.html", ["Satire"])).toBe(false);
    expect(entry("Show", "https://www.aljazeera.com/x", ["Show Types"])).toBe(false);
  });
});

describe("canonicalUrl", () => {
  it("removes fragments and tracking parameters but keeps real ones", () => {
    expect(canonicalUrl("https://www.spiegel.de/a-1#ref=rss")).toBe("https://www.spiegel.de/a-1");
    expect(
      canonicalUrl(
        "https://www.politico.eu/article/x/?utm_source=RSS_Feed&utm_medium=RSS&utm_campaign=RSS",
      ),
    ).toBe("https://www.politico.eu/article/x/");
    expect(
      canonicalUrl("https://www.bbc.co.uk/news/articles/c1?at_medium=RSS&at_campaign=rss"),
    ).toBe("https://www.bbc.co.uk/news/articles/c1");
    expect(canonicalUrl("https://example.com/story?id=42&maca=de-rss")).toBe(
      "https://example.com/story?id=42",
    );
  });
});

describe("splitKicker", () => {
  it.each([
    [
      "Junge Union: Johannes Winkel als Vorsitzender wiedergewählt",
      "Junge Union",
      "Johannes Winkel als Vorsitzender wiedergewählt",
    ],
    [
      "Weißes Haus - Trumps Pressesprecherin Zacharia tritt wieder ab",
      "Weißes Haus",
      "Trumps Pressesprecherin Zacharia tritt wieder ab",
    ],
    [
      "MELDUNGEN POLIZEI - Kantonspolizei Zürich nimmt zwei Männer fest",
      "Meldungen Polizei",
      "Kantonspolizei Zürich nimmt zwei Männer fest",
    ],
  ])("splits %s", (headline, topline, title) => {
    expect(splitKicker(headline)).toEqual({ topline, title });
  });

  it.each([
    "‘The boats don’t stop’: The deadly coastline that has become a trafficking hub",
    "Why Are France’s Students Protesting?",
    "Trump: Short",
    "Ein sehr langer Satzanfang mit vielen Wörtern davor: und dann der Rest der Zeile",
  ])("leaves %s alone", (headline) => {
    expect(splitKicker(headline)).toEqual({ topline: null, title: headline });
  });
});

import { describe, expect, it } from "vitest";
import {
  assignClusters,
  type ClusterSeed,
  keywords,
  SIMILARITY_THRESHOLD,
  similarity,
  storyKeywords,
} from "./cluster.ts";

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 17, 8, minutes));

function report(id: string, title: string, firstSentence = "", ressort: string | null = null) {
  return { id, title, topline: null, firstSentence, ressort, publishedAt: at(Number(id.at(-1))) };
}

describe("keywords", () => {
  it("drops stopwords and short words, trims inflections and keeps acronyms", () => {
    const tokens = keywords("Die Union will Änderungen bei der Zuckersteuer, sagt die SPD");
    expect(tokens).toContain("union");
    expect(tokens).toContain("änderun");
    expect(tokens).toContain("zuckers");
    expect(tokens).toContain("spd");
    expect(tokens).not.toContain("die");
    expect(tokens).not.toContain("will");
  });

  it("maps inflected forms to the same stem", () => {
    expect(keywords("Sanktionen")).toEqual(keywords("Sanktion"));
  });
});

describe("similarity", () => {
  it("needs at least three shared keywords", () => {
    expect(similarity(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(0);
    expect(similarity(new Set(["a", "b", "c"]), new Set(["a", "b", "c"]))).toBe(1);
  });
});

// Real headlines and teasers from 17 October 2026.
const sugarTax = [
  report(
    "dlf1",
    "Unionsfraktionschef Frei will Änderungen bei Zuckersteuer",
    "Unionsfraktionschef Frei hat Änderungen an der geplanten Zuckersteuer angekündigt.",
  ),
  report(
    "spiegel2",
    "Unionsfraktionschef will Änderungen bei Zuckersteuer",
    "Thorsten Frei sieht bei der geplanten Zuckersteuer Nachbesserungsbedarf.",
    "inland",
  ),
  report(
    "ntv3",
    "Frei fordert Änderungen an geplanter Zuckersteuer",
    "Die Hersteller brauchen mehr Zeit: Unionsfraktionschef Frei will die Zuckersteuer ändern.",
  ),
];
const pressSecretary = [
  report(
    "bbc4",
    "Katie Zacharia leaving White House role less than five days into job",
    "Katie Zacharia is leaving her role as White House press secretary after less than five days.",
  ),
  report(
    "npr5",
    "Katie Zacharia is out as press secretary, White House says",
    "The White House says press secretary Katie Zacharia is transitioning out of the role.",
  ),
];
const unrelated = report(
  "guardian6",
  "Brazilian Amazon deforestation falls to lowest on record",
  "Deforestation in the Brazilian Amazon fell to its lowest level since records began.",
);

describe("assignClusters", () => {
  it("groups reports of the same event across outlets and keeps others apart", () => {
    const seeds: ClusterSeed[] = [];
    const result = assignClusters([...sugarTax, ...pressSecretary, unrelated], seeds);
    const clusterOf = (id: string) => result.find((story) => story.id === id)?.clusterId;

    expect(new Set(sugarTax.map((story) => clusterOf(story.id)))).toEqual(new Set(["dlf1"]));
    expect(new Set(pressSecretary.map((story) => clusterOf(story.id)))).toEqual(new Set(["bbc4"]));
    expect(clusterOf("guardian6")).toBe("guardian6");
    expect(seeds.map((seed) => seed.clusterId)).toEqual(["dlf1", "bbc4", "guardian6"]);
  });

  it("names the cluster after its earliest report, whatever the input order", () => {
    const result = assignClusters([...sugarTax].reverse(), []);
    expect(result.every((story) => story.clusterId === "dlf1")).toBe(true);
  });

  it("joins clusters from earlier ingests and inherits their section", () => {
    const seeds: ClusterSeed[] = [
      { clusterId: "tagesschau-1", ressort: "inland", keywords: storyKeywords(sugarTax[1]!) },
    ];
    const [joined] = assignClusters([sugarTax[0]!], seeds);
    expect(joined).toMatchObject({ clusterId: "tagesschau-1", ressort: "inland" });
  });

  it("shares the first known section with every report of the event", () => {
    const seeds: ClusterSeed[] = [];
    const result = assignClusters(sugarTax, seeds);
    expect(result.map((story) => story.ressort)).toEqual(["inland", "inland", "inland"]);
    expect(seeds[0]?.ressort).toBe("inland");
  });

  it("uses a threshold that separates the examples", () => {
    const sameEvent = similarity(storyKeywords(sugarTax[0]!), storyKeywords(sugarTax[2]!));
    const different = similarity(storyKeywords(sugarTax[0]!), storyKeywords(unrelated));
    expect(sameEvent).toBeGreaterThanOrEqual(SIMILARITY_THRESHOLD);
    expect(different).toBeLessThan(SIMILARITY_THRESHOLD);
  });
});

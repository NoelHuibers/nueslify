import type { NewsSourceId } from "#/lib/news/sources.ts";

/** A story from one of the listener's outlets, as loaded for planning. */
export type CandidateStory = {
  id: string;
  sourceId: NewsSourceId;
  clusterId: string;
  ressort: string | null;
  regionId: number | null;
  title: string;
  topline: string | null;
  breaking: boolean;
  publishedAt: Date;
  /** Length of the stored text; full articles make better summaries than teasers. */
  bodyLength: number;
};

/** One event: the best report of it plus the other outlets that covered it. */
export type RankedStory = CandidateStory & {
  score: number;
  /** Number of outlets (of all ingested ones) that reported the event. */
  coverage: number;
  others: { id: string; sourceId: NewsSourceId }[];
};

const HOUR = 3_600_000;
const HALF_LIFE_HOURS = 6;
const USEFUL_BODY_LENGTH = 2000;
const MAX_OTHERS = 3;

/**
 * News value of an event: fresher is better (halving every six hours), and every doubling of
 * the number of outlets covering it counts like one more unit of freshness. Breaking news gets
 * a fixed boost. A single-outlet story from just now scores 1; the same event covered by four
 * outlets six hours ago scores 1.5.
 */
export function newsScore(options: {
  latest: Date;
  coverage: number;
  breaking: boolean;
  now: Date;
}): number {
  const ageHours = Math.max(0, (options.now.getTime() - options.latest.getTime()) / HOUR);
  const recency = 0.5 ** (ageHours / HALF_LIFE_HOURS);
  return recency * (1 + Math.log2(Math.max(1, options.coverage))) + (options.breaking ? 1 : 0);
}

function byQuality(a: CandidateStory, b: CandidateStory): number {
  const depth =
    Math.min(b.bodyLength, USEFUL_BODY_LENGTH) - Math.min(a.bodyLength, USEFUL_BODY_LENGTH);
  return depth === 0 ? b.publishedAt.getTime() - a.publishedAt.getTime() : depth;
}

function rankCluster(
  members: readonly CandidateStory[],
  coverage: number,
  now: Date,
): RankedStory | null {
  const [lead, ...rest] = [...members].sort(byQuality);
  if (!lead) {
    return null;
  }
  const others: RankedStory["others"] = [];
  for (const member of [...rest].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  )) {
    const known =
      member.sourceId === lead.sourceId || others.some((o) => o.sourceId === member.sourceId);
    if (!known && others.length < MAX_OTHERS) {
      others.push({ id: member.id, sourceId: member.sourceId });
    }
  }
  const latest = Math.max(...members.map((member) => member.publishedAt.getTime()));
  const outlets = Math.max(coverage, new Set(members.map((member) => member.sourceId)).size);
  const breaking = members.some((member) => member.breaking);
  return {
    ...lead,
    ressort: lead.ressort ?? members.find((member) => member.ressort !== null)?.ressort ?? null,
    regionId: lead.regionId ?? members.find((member) => member.regionId !== null)?.regionId ?? null,
    breaking,
    coverage: outlets,
    others,
    score: newsScore({ latest: new Date(latest), coverage: outlets, breaking, now }),
  };
}

/** Collapses stories into one entry per event, best-ranked first. */
export function rankStories(
  candidates: readonly CandidateStory[],
  coverage: ReadonlyMap<string, number>,
  now: Date,
): RankedStory[] {
  const clusters = new Map<string, CandidateStory[]>();
  for (const candidate of candidates) {
    const key = candidate.clusterId || candidate.id;
    const members = clusters.get(key);
    if (members) {
      members.push(candidate);
    } else {
      clusters.set(key, [candidate]);
    }
  }
  return [...clusters]
    .flatMap(([key, members]) => rankCluster(members, coverage.get(key) ?? 1, now) ?? [])
    .sort((a, b) => b.score - a.score || b.publishedAt.getTime() - a.publishedAt.getTime());
}

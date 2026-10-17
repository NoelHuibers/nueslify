/**
 * Groups reports about the same event across outlets ("story clusters"), so the show can rank
 * events by how widely they are covered, never replays an event you already heard from another
 * outlet, and lets the host cite every outlet that reported it.
 *
 * Headlines and teasers are reduced to stemmed keywords (names, places, topics) and compared
 * with cosine similarity. New stories are compared with each cluster's first story only, which
 * keeps clusters from drifting through chains of loosely related reports.
 */

const STOPWORDS = new Set(
  [
    // German
    "aber alle allem allen aller alles also auch auf aus bei beim bereits bis bisher dabei damit",
    "dann darf darum dass dazu dem den denen der deren des dessen die dies diese diesem diesen",
    "dieser dieses doch dort durch eine einem einen einer eines einige etwa euch für gegen gibt",
    "habe haben hatte hätte heute hier ihre ihren immer jetzt kann kein keine können künftig mehr",
    "mein mich mit muss nach nicht noch nun nur oder ohne sehr seid sein seine seit selbst sich",
    "sie sind soll sollen sondern sowie über und uns unter viel vom von vor wann war waren warum",
    "was weil weiter weitere wenn wer werden wie wieder will wird wurde wurden zum zur zwei drei",
    "neue neuen neuer ersten erste jahr jahre jahren laut sagt sagte heißt",
    // English
    "after again against also amid been before being between both could does during each from",
    "have having here into just more most much need news only other over said says should some",
    "still such than that their them then there these they this those through under until very",
    "want were what when where which while will with would year years your about told first last",
    "week report reports latest",
  ]
    .join(" ")
    .split(" "),
);

const NON_WORD = /[^\p{L}\p{N}]+/u;
const ACRONYM = /^\p{Lu}{2,4}$/u;
const INFLECTION = /(en|es|er|s|e|n)$/u;
const STEM_LENGTH = 7;

/** Stemmed keywords of a story: lower-cased, stopwords dropped, inflections trimmed. */
export function keywords(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const word of text.normalize("NFKC").split(NON_WORD)) {
    const lower = word.toLowerCase();
    const meaningful = (lower.length >= 4 || ACRONYM.test(word)) && !STOPWORDS.has(lower);
    if (meaningful) {
      const stem = lower.length > 5 ? lower.replace(INFLECTION, "") : lower;
      tokens.add(stem.slice(0, STEM_LENGTH));
    }
  }
  return tokens;
}

export function storyKeywords(story: {
  title: string;
  topline: string | null;
  firstSentence: string | null;
}): Set<string> {
  return keywords(
    [story.topline ?? "", story.title, (story.firstSentence ?? "").slice(0, 300)].join(" "),
  );
}

const MIN_SHARED = 3;
export const SIMILARITY_THRESHOLD = 0.28;

/** Cosine similarity of two keyword sets; 0 unless they share at least three keywords. */
export function similarity(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) {
      shared += 1;
    }
  }
  return shared < MIN_SHARED ? 0 : shared / Math.sqrt(a.size * b.size);
}

export type ClusterSeed = {
  clusterId: string;
  /** The cluster's section: its first story's, or the first one a later report brings. */
  ressort: string | null;
  keywords: ReadonlySet<string>;
};

export type Clusterable = {
  id: string;
  title: string;
  topline: string | null;
  firstSentence: string | null;
  ressort: string | null;
  publishedAt: Date;
};

/**
 * Assigns every story a cluster: the best-matching existing seed, or a new cluster of its own.
 * Sections are shared within a cluster: a Deutschlandfunk teaser without one joining a
 * tagesschau "ausland" story becomes "ausland", and vice versa. Mutates `seeds`.
 */
export function assignClusters<T extends Clusterable>(
  stories: readonly T[],
  seeds: ClusterSeed[],
): (T & { clusterId: string })[] {
  const index = new Map<string, ClusterSeed[]>();
  const addSeed = (seed: ClusterSeed) => {
    seeds.push(seed);
    for (const token of seed.keywords) {
      const bucket = index.get(token);
      if (bucket) {
        bucket.push(seed);
      } else {
        index.set(token, [seed]);
      }
    }
  };
  const existing = [...seeds];
  seeds.length = 0;
  for (const seed of existing) {
    addSeed(seed);
  }

  // Oldest first, so the first report of an event names the cluster.
  const ordered = [...stories].sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  const assigned = ordered.map((story) => {
    const tokens = storyKeywords(story);
    const candidates = new Set([...tokens].flatMap((token) => index.get(token) ?? []));
    let best: ClusterSeed | null = null;
    let bestScore = SIMILARITY_THRESHOLD;
    for (const seed of candidates) {
      const score = similarity(tokens, seed.keywords);
      if (score >= bestScore) {
        best = seed;
        bestScore = score;
      }
    }
    if (best) {
      best.ressort ??= story.ressort;
      return { story, seed: best };
    }
    const seed = { clusterId: story.id, ressort: story.ressort, keywords: tokens };
    addSeed(seed);
    return { story, seed };
  });
  return assigned.map(({ story, seed }) => ({
    ...story,
    clusterId: seed.clusterId,
    ressort: story.ressort ?? seed.ressort,
  }));
}

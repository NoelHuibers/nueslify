import { shuffle } from "#/lib/async.ts";
import type { CategoryId, TrackRef } from "#/lib/domain.ts";
import type { ItemContext } from "#/server/ai/prompts.ts";
import type { RankedStory } from "./ranking.ts";

export type PlannedSegment =
  | { kind: "host"; role: "intro" | "bridge"; from: ItemContext; to: ItemContext }
  | { kind: "news"; story: RankedStory }
  | { kind: "music"; track: TrackRef };

/**
 * Picks stories for a block: breaking news first, then round-robin across the listener's
 * region and categories (rotating which category leads each block), best-ranked first, and
 * preferring an outlet that hasn't had a turn in this block yet.
 */
export function pickStories(
  candidates: readonly RankedStory[],
  prefs: { categories: readonly CategoryId[]; regionId: number | null },
  count: number,
  blockIndex = 0,
): RankedStory[] {
  if (count <= 0) {
    return [];
  }
  const byRank = [...candidates].sort(
    (a, b) => b.score - a.score || b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
  const categories: readonly string[] = prefs.categories.length > 0 ? prefs.categories : [];
  const inCategories = (story: RankedStory) =>
    categories.length === 0 || (story.ressort !== null && categories.includes(story.ressort));

  const pools: RankedStory[][] = [];
  if (prefs.regionId !== null) {
    pools.push(byRank.filter((story) => story.regionId === prefs.regionId));
  }
  const ressortOrder =
    categories.length > 0 ? categories : [...new Set(byRank.map((s) => s.ressort))];
  const rotation = ressortOrder.length > 0 ? blockIndex % ressortOrder.length : 0;
  for (const ressort of [...ressortOrder.slice(rotation), ...ressortOrder.slice(0, rotation)]) {
    pools.push(byRank.filter((story) => story.ressort === ressort && story.regionId === null));
  }

  const picked: RankedStory[] = [];
  const taken = new Set<string>();
  const take = (story: RankedStory | undefined) => {
    if (story && !taken.has(story.id) && picked.length < count) {
      taken.add(story.id);
      picked.push(story);
    }
  };
  const nextFrom = (pool: readonly RankedStory[]) => {
    const open = pool.filter((story) => !taken.has(story.id));
    return open.find((story) => !picked.some((p) => p.sourceId === story.sourceId)) ?? open[0];
  };

  for (const story of byRank.filter((s) => s.breaking && inCategories(s))) {
    take(story);
  }
  for (let round = 0; picked.length < count; round += 1) {
    const before = picked.length;
    for (const pool of pools) {
      take(nextFrom(pool));
    }
    if (picked.length === before || round > count) {
      break;
    }
  }
  // Still short (e.g. a quiet news day in the chosen categories): fill with anything fresh.
  for (const story of byRank) {
    take(story);
  }
  return picked;
}

export function pickTracks(
  tracks: readonly TrackRef[],
  recentIds: ReadonlySet<string>,
  count: number,
  random: () => number = Math.random,
): TrackRef[] {
  if (count <= 0 || tracks.length === 0) {
    return [];
  }
  const fresh = tracks.filter((track) => !recentIds.has(track.id));
  const pool = fresh.length >= count ? fresh : tracks;
  return shuffle(pool, random).slice(0, count);
}

export function trackContext(track: TrackRef, mentionTracks: boolean, count = 1): ItemContext {
  return mentionTracks
    ? { kind: "track", name: track.name, artists: track.artists }
    : { kind: "music", count };
}

export function storyContext(story: Pick<RankedStory, "title" | "topline">): ItemContext {
  return { kind: "story", title: story.title, topline: story.topline };
}

function openingItem(
  track: TrackRef | undefined,
  firstStory: RankedStory | undefined,
  mentionTracks: boolean,
  trackCount: number,
): ItemContext | null {
  if (track) {
    return trackContext(track, mentionTracks, trackCount);
  }
  return firstStory ? storyContext(firstStory) : null;
}

/** Lays out a block: host → songs → host → news stories. */
export function planBlock(options: {
  index: number;
  tracks: readonly TrackRef[];
  stories: readonly RankedStory[];
  previous: ItemContext;
  mentionTracks: boolean;
}): PlannedSegment[] {
  const { index, tracks, stories, previous, mentionTracks } = options;
  const [firstTrack] = tracks;
  const [firstStory] = stories;
  const lastTrack = tracks.at(-1);

  const opening = openingItem(firstTrack, firstStory, mentionTracks, tracks.length);
  if (!opening) {
    return [];
  }

  const segments: PlannedSegment[] = [
    index === 0
      ? { kind: "host", role: "intro", from: { kind: "nothing" }, to: opening }
      : { kind: "host", role: "bridge", from: previous, to: opening },
  ];
  for (const track of tracks) {
    segments.push({ kind: "music", track });
  }
  if (firstStory) {
    if (lastTrack) {
      segments.push({
        kind: "host",
        role: "bridge",
        from: trackContext(lastTrack, mentionTracks, tracks.length),
        to: storyContext(firstStory),
      });
    }
    for (const story of stories) {
      segments.push({ kind: "news", story });
    }
  }
  return segments;
}

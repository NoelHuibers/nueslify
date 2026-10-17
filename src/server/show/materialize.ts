import { inArray } from "drizzle-orm";
import { type HostSegment, type NewsSegment, regionName, type Segment } from "#/lib/domain.ts";
import { newsSourceName } from "#/lib/news/sources.ts";
import { synthesize, writeScript } from "#/server/ai/host.ts";
import type { ListenerContext } from "#/server/ai/prompts.ts";
import { findCachedClip, type StoredClip, storeClip } from "#/server/clips.ts";
import type { Database } from "#/server/db/client.ts";
import { listen, story } from "#/server/db/schema.ts";
import type { StoredPreferences } from "#/server/preferences.ts";
import type { PlannedSegment } from "./planner.ts";
import type { RankedStory } from "./ranking.ts";

type OtherReport = { source: string; title: string; teaser: string | null };

export type StoryDetails = Map<
  string,
  { body: string; shareUrl: string; others: readonly OtherReport[] }
>;

export type MaterializeContext = {
  db: Database;
  userId: string;
  prefs: StoredPreferences;
  listener: ListenerContext;
  details: StoryDetails;
};

/** Article text of the picked stories, plus the other outlets' teasers about the same events. */
export async function loadStoryDetails(
  db: Database,
  stories: readonly RankedStory[],
): Promise<StoryDetails> {
  const ids = stories.flatMap((picked) => [picked.id, ...picked.others.map((other) => other.id)]);
  if (ids.length === 0) {
    return new Map();
  }
  const rows = await db
    .select({
      id: story.id,
      sourceId: story.sourceId,
      title: story.title,
      firstSentence: story.firstSentence,
      body: story.body,
      shareUrl: story.shareUrl,
    })
    .from(story)
    .where(inArray(story.id, ids));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return new Map(
    stories.flatMap((picked) => {
      const row = byId.get(picked.id);
      if (!row) {
        return [];
      }
      const others = picked.others.flatMap((other) => {
        const report = byId.get(other.id);
        return report
          ? [
              {
                source: newsSourceName(report.sourceId),
                title: report.title,
                teaser: report.firstSentence,
              },
            ]
          : [];
      });
      return [[picked.id, { body: row.body, shareUrl: row.shareUrl, others }]];
    }),
  );
}

/** Turns a planned segment into a playable one: writes the script, speaks it, stores the audio. */
export function materialize(planned: PlannedSegment, ctx: MaterializeContext): Promise<Segment> {
  switch (planned.kind) {
    case "music":
      return Promise.resolve({ id: crypto.randomUUID(), kind: "music", track: planned.track });
    case "host":
      return materializeHost(planned, ctx);
    case "news":
      return materializeNews(planned.story, ctx);
    default:
      return planned satisfies never;
  }
}

function voiceOf(prefs: StoredPreferences) {
  return { voice: prefs.voice, style: prefs.hostStyle, language: prefs.language };
}

async function materializeHost(
  planned: Extract<PlannedSegment, { kind: "host" }>,
  { db, userId, prefs, listener }: MaterializeContext,
): Promise<HostSegment> {
  const request =
    planned.role === "intro"
      ? ({ kind: "intro", next: planned.to } as const)
      : ({ kind: "bridge", from: planned.from, to: planned.to } as const);
  const transcript = await writeScript(request, listener, prefs.aiProvider);
  const audio = await synthesize(transcript, voiceOf(prefs));
  const stored = await storeClip(db, { kind: planned.role, transcript, audio, userId });
  return {
    id: stored.id,
    kind: "host",
    role: planned.role,
    audioUrl: stored.url,
    transcript: stored.transcript,
  };
}

/**
 * News clips are shared between listeners with the same language, style, voice and provider —
 * and, since the host cites them, the same other outlets covering the story.
 */
export function newsCacheKey(
  picked: Pick<RankedStory, "id" | "others">,
  prefs: StoredPreferences,
): string {
  const others = picked.others.map((other) => other.sourceId).sort();
  return [
    "news",
    picked.id,
    prefs.language,
    prefs.hostStyle,
    prefs.voice,
    prefs.aiProvider,
    ...(others.length > 0 ? [others.join("+")] : []),
  ].join(":");
}

const FULL_ARTICLE_LENGTH = 1200;

async function renderNewsClip(
  picked: RankedStory,
  details: { body: string; others: readonly OtherReport[] },
  { db, prefs, listener }: MaterializeContext,
): Promise<StoredClip> {
  const transcript = await writeScript(
    {
      kind: "news",
      story: {
        source: newsSourceName(picked.sourceId),
        title: picked.title,
        topline: picked.topline,
        body: details.body,
        fullArticle: details.body.length >= FULL_ARTICLE_LENGTH,
        ressort: picked.ressort,
        regionName: regionName(picked.regionId),
        others: details.others,
      },
    },
    // Shared clips must not be personalised, so drop the listener's name and region.
    { ...listener, name: null, regionName: null },
    prefs.aiProvider,
  );
  const audio = await synthesize(transcript, voiceOf(prefs));
  return storeClip(db, {
    kind: "news",
    transcript,
    audio,
    userId: null,
    storyId: picked.id,
    cacheKey: newsCacheKey(picked, prefs),
  });
}

async function materializeNews(picked: RankedStory, ctx: MaterializeContext): Promise<NewsSegment> {
  const details = ctx.details.get(picked.id);
  if (!details) {
    throw new Error(`Story ${picked.id} disappeared`);
  }
  const stored =
    (await findCachedClip(ctx.db, newsCacheKey(picked, ctx.prefs))) ??
    (await renderNewsClip(picked, details, ctx));

  await ctx.db
    .insert(listen)
    .values({ id: crypto.randomUUID(), userId: ctx.userId, storyId: picked.id, clipId: stored.id })
    .onConflictDoUpdate({
      target: [listen.userId, listen.storyId],
      set: { servedAt: new Date(), clipId: stored.id },
    });

  return {
    id: stored.id,
    kind: "news",
    audioUrl: stored.url,
    transcript: stored.transcript,
    story: {
      id: picked.id,
      sourceId: picked.sourceId,
      alsoReportedBy: picked.others.map((other) => other.sourceId),
      title: picked.title,
      topline: picked.topline,
      ressort: picked.ressort,
      regionId: picked.regionId,
      shareUrl: details.shareUrl,
      publishedAt: picked.publishedAt.toISOString(),
    },
  };
}

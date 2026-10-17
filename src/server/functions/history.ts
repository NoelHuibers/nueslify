import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";
import type { NewsSourceId } from "#/lib/news/sources.ts";
import { db } from "#/server/db/client.ts";
import { clip, listen, savedStory, story } from "#/server/db/schema.ts";
import { authMiddleware } from "./middleware.ts";

const PAGE_SIZE = 20;

export type HistoryItem = {
  storyId: string;
  sourceId: NewsSourceId;
  title: string;
  topline: string | null;
  ressort: string | null;
  regionId: number | null;
  shareUrl: string;
  publishedAt: string;
  heardAt: string;
  transcript: string | null;
  audioUrl: string | null;
  saved: boolean;
};

export type HistoryPage = { items: HistoryItem[]; nextCursor: string | null };

export const listHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      cursor: z.iso.datetime().nullable().default(null),
      savedOnly: z.boolean().default(false),
    }),
  )
  .handler(async ({ context, data }): Promise<HistoryPage> => {
    const userId = context.user.id;
    const rows = await db
      .select({
        storyId: story.id,
        sourceId: story.sourceId,
        title: story.title,
        topline: story.topline,
        ressort: story.ressort,
        regionId: story.regionId,
        shareUrl: story.shareUrl,
        publishedAt: story.publishedAt,
        heardAt: listen.servedAt,
        transcript: clip.transcript,
        audioUrl: clip.url,
        savedAt: savedStory.createdAt,
      })
      .from(listen)
      .innerJoin(story, eq(story.id, listen.storyId))
      .leftJoin(clip, eq(clip.id, listen.clipId))
      .leftJoin(
        savedStory,
        and(eq(savedStory.storyId, listen.storyId), eq(savedStory.userId, userId)),
      )
      .where(
        and(
          eq(listen.userId, userId),
          data.cursor ? lt(listen.servedAt, new Date(data.cursor)) : undefined,
          data.savedOnly ? eq(savedStory.userId, userId) : undefined,
        ),
      )
      .orderBy(desc(listen.servedAt))
      .limit(PAGE_SIZE + 1);

    const page = rows.slice(0, PAGE_SIZE);
    return {
      items: page.map(({ savedAt, publishedAt, heardAt, ...row }) => ({
        ...row,
        publishedAt: publishedAt.toISOString(),
        heardAt: heardAt.toISOString(),
        saved: savedAt !== null,
      })),
      nextCursor: rows.length > PAGE_SIZE ? (page.at(-1)?.heardAt.toISOString() ?? null) : null,
    };
  });

export const setStorySaved = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ storyId: z.string().min(1).max(100), saved: z.boolean() }))
  .handler(async ({ context, data }) => {
    if (data.saved) {
      await db
        .insert(savedStory)
        .values({ userId: context.user.id, storyId: data.storyId })
        .onConflictDoNothing();
    } else {
      await db
        .delete(savedStory)
        .where(and(eq(savedStory.userId, context.user.id), eq(savedStory.storyId, data.storyId)));
    }
    return { saved: data.saved };
  });

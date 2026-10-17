import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_NEWS_SOURCES, isNewsSourceId } from "#/lib/news/sources.ts";
import { pruneClips } from "#/server/clips.ts";
import { db } from "#/server/db/client.ts";
import { preferences } from "#/server/db/schema.ts";
import { env } from "#/server/env.ts";
import { safeEqual } from "#/server/http.ts";
import { allFeeds } from "#/server/news/feeds.ts";
import { newsSource } from "#/server/news/index.ts";
import { ingestNews } from "#/server/news/ingest.ts";

const MIN_SECRET_LENGTH = 16;

/** Every outlet at least one listener has picked (plus the default for new listeners). */
async function sourcesInUse() {
  const rows = await db.selectDistinct({ sources: preferences.newsSources }).from(preferences);
  return [...DEFAULT_NEWS_SOURCES, ...rows.flatMap((row) => row.sources)].filter(isNewsSourceId);
}

/** Called by Vercel Cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`. */
export const Route = createFileRoute("/api/cron/news")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = env.CRON_SECRET ?? "";
        const header = request.headers.get("authorization") ?? "";
        if (secret.length < MIN_SECRET_LENGTH || !safeEqual(header, `Bearer ${secret}`)) {
          return Response.json({ ok: false }, { status: 401 });
        }
        const feeds = allFeeds(await sourcesInUse());
        const news = await ingestNews({ db, source: newsSource(), feeds });
        const prunedClips = await pruneClips(db);
        return Response.json({ ok: true, news, prunedClips });
      },
    },
  },
});

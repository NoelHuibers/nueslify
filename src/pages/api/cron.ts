import { db } from "~/server/db";
import { news } from "~/server/db/schema";
import getNews from "~/utils/getNews";
import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //const authHeader = request.headers.get("Authorization");
  //if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
  // return response.status(401).json({ success: false });
  //}

  const newNews = await getNews();
  await Promise.all(
    newNews.map(async (item) => {
      const check = await db
        .select()
        .from(news)
        .where(eq(news.externalId, item.externalId))
        .limit(1);
      if (
        check.length === 0 &&
        item.detailsContent !== undefined &&
        item.detailsContent !== "" &&
        item.detailsContent !== null
      ) {
        await db.insert(news).values({
          externalId: item.externalId,
          regionId: item.regionId,
          ressort: item.ressort ? item.ressort : null,
          title: item.title,
          shareurl: item.shareURL,
          firstline: item.firstSentence,
          details: item.detailsContent,
        });
      }
    }),
  );

  return response.json("News saved");
}

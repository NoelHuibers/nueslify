import { db } from "~/server/db";
import { news } from "~/server/db/schema";
import getNews from "~/utils/getNews";
import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

export default async function handler(
  _request: NextApiRequest,
  response: NextApiResponse,
) {
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

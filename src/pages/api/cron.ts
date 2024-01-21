import { db } from "~/server/db";
import { news } from "~/server/db/schema";
import getNews from "~/utils/getNews";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  _request: NextApiRequest,
  response: NextApiResponse,
) {
  const newNews = await getNews();
  await Promise.all(
    newNews.map((item) =>
      db
        .insert(news)
        .values({
          ressort: item.ressort ? item.ressort : "none",
          topline: item.title,
          shareurl: item.shareURL,
          firstline: item.firstSentence,
        })
        .execute(),
    ),
  );

  return response.json("News saved");
}

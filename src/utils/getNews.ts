import axios from "axios";
import type { AxiosResponse } from "axios";

type TagesschauResponse = {
  news: NewsItem[];
};

type NewsItem = {
  externalId: string;
  regionId: number;
  title: string;
  firstSentence?: string;
  shareURL: string;
  ressort?: string;
  details?: string;
  detailsContent?: string;
};

const ressorts = ["inland", "ausland", "wirtschaft", "sport", "investigativ"];

async function getNews(): Promise<NewsItem[]> {
  const newsPromises = ressorts.map(getNewsForRessortAndAllRegions);
  const newsForAllRessortsAndRegions = await Promise.all(newsPromises);
  const uniqueNewsItems = newsForAllRessortsAndRegions.flat();

  const detailsPromises = uniqueNewsItems.map((item) =>
    item.details ? axios.get(item.details) : Promise.resolve(),
  );
  const detailsResponses = await Promise.all(detailsPromises);

  const newsWithDetails = uniqueNewsItems.map((item, index) => {
    const detailsContent = detailsResponses[index]?.data.content
      ?.filter((content: { type: string }) => content.type === "text")
      .map((content: { value: string }) => content.value)
      .filter((value: string) => !/<[^>]+>|href=/.test(value))
      .join("");
    return { ...item, detailsContent };
  });
  return newsWithDetails;
}

async function getNewsForRessortAndAllRegions(
  ressort: string,
): Promise<NewsItem[]> {
  const regionsString = Array.from({ length: 16 }, (_, i) => i + 1).join(",");
  const response: AxiosResponse<TagesschauResponse> = await axios.get(
    `https://www.tagesschau.de/api2/news/?regions=${regionsString}&ressort=${ressort}`,
  );

  const uniqueNewsItems: NewsItem[] = [];
  const seenExternalIds = new Set();
  for (const item of response.data.news) {
    if (!seenExternalIds.has(item.externalId) && item.details) {
      seenExternalIds.add(item.externalId);
      if (!item.ressort) {
        item.ressort = ressort;
      }
      uniqueNewsItems.push(item);
    }
  }

  return uniqueNewsItems;
}
export default getNews;

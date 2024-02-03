import {
  type Segment,
  getMusicContent,
  type Music,
  Interest,
} from "~/utils/GPT/GPT";
import {
  createTransition,
  createNewsSummary,
  createStart,
} from "./GPT/OpenAIGPT";
import getTopTracks from "~/utils/getTopTracks";
import { db } from "~/server/db";
import { news } from "~/server/db/schema";
import { User } from "./getUserData";

import runLLM from "~/utils/GPT/langchain";
import { desc, eq } from "drizzle-orm";

const mixer = async (
  title: string | undefined,
  artistNames: string[] | undefined,
  newscontent: string | undefined,
  accessToken: string,
  user: User,
) => {
  if (newscontent) {
    const newsSegment: Segment = {
      segmentKind: "news",
      content: {
        content: "Tolle Nachrichten aus aller Welt",
      },
    };

    const musicSegment: Segment = {
      segmentKind: "music",
      content: await getContentForNewMusicSegment(
        accessToken,
        user.musicNewsBalance ? user.musicNewsBalance : 50,
      ),
    };

    const musicIds = getMusicContent(musicSegment)?.map((track) => track.id);

    const transitionSegment = await createTransition(
      newsSegment,
      musicSegment,
      user,
    );

    return { transitionSegment, musicIds: musicIds ? musicIds : [] };
  } else if (artistNames && title) {
    const newsContent = await getNews(["sport"]);

    const currentSegment: Segment = {
      segmentKind: "music",
      content: [
        {
          artistNames: artistNames,
          id: "",
          title: title,
        },
      ],
    };

    const newsSegment = await createNewsSummary(
      newsContent
        ? newsContent.details
          ? newsContent.details
          : newsContent.firstline
            ? newsContent.firstline
            : ""
        : "",
      newsContent?.title ?? "News",
      user,
    );
    const transitionSegment = await createTransition(
      currentSegment,
      newsSegment,
      user,
    );

    return { transitionSegment, newsSegment };
  } else {
    const musicSegment: Segment = {
      segmentKind: "music",
      content: await getContentForNewMusicSegment(
        accessToken,
        user.musicNewsBalance ? user.musicNewsBalance : 50,
      ),
    };

    const musicIds = getMusicContent(musicSegment)?.map((track) => track.id);

    const transitionSegment = await createStart(musicSegment, user);

    return { transitionSegment, musicIds: musicIds ? musicIds : [] };
  }
};

const getContentForNewMusicSegment = async (
  accessToken: string,
  musicValue: number,
) => {
  const nextSongs = await getSongs(accessToken, musicValue);
  return nextSongs.map((song) => {
    const music: Music = {
      artistNames: song.artistNames ? song.artistNames : [],
      id: song.id,
      title: song.name,
    };
    return music;
  });
};

const getSongs = async (accessToken: string, musicValue: number) => {
  const count = Math.floor(Math.random() * (musicValue / 15) + 2);
  const topTracks = await getTopTracks(accessToken);

  if (topTracks.length < count) {
    return topTracks;
  } else {
    return getRandom(topTracks, count);
  }
};

function getRandom<T>(arr: T[], n: number): T[] {
  if (n > arr.length) {
    throw new Error("getRandom: more elements taken than available");
  }

  const result = new Array<T>(n);
  const taken = new Set<number>();

  for (let i = 0; i < n; i++) {
    let x = Math.floor(Math.random() * arr.length);

    while (taken.has(x)) {
      x = Math.floor(Math.random() * arr.length);
    }

    result[i] = arr[x]!;
    taken.add(x);
  }

  return result;
}

const getNews = async (ressort: Interest[]) => {
  const randomNewsAll = await Promise.all(
    ressort.map(async (ressort) => {
      return await db
        .select()
        .from(news)
        .where(eq(news.ressort, ressort))
        .orderBy(desc(news.id))
        .limit(20);
    }),
  );

  const randomNews = randomNewsAll.flat();

  const number = getRandomNumber(randomNews.length);
  return randomNews[number];
};

const getRandomNumber = (maxId: number): number => {
  return Math.floor(Math.random() * maxId) + 1;
};

export default mixer;

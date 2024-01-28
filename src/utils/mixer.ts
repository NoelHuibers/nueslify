import { type Segment, getMusicContent, type Music } from "~/utils/GPT/GPT";
import {
  createTransition,
  createNewsSummary,
  createStart,
} from "./GPT/OpenAIGPT";
import getTopTracks from "~/utils/getTopTracks";
import { db } from "~/server/db";
import { news } from "~/server/db/schema";

const mixer = async (
  title: string | undefined,
  artistNames: string[] | undefined,
  newscontent: string | undefined,
  accessToken: string,
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
      content: await getContentForNewMusicSegment(accessToken),
    };

    const musicIds = getMusicContent(musicSegment)?.map((track) => track.id);

    const transitionSegment = await createTransition(newsSegment, musicSegment);

    return { transitionSegment, musicIds: musicIds ? musicIds : [] };
  } else if (artistNames && title) {
    const newsContent = await getNews();

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
      newsContent?.topline ? newsContent?.topline : "",
    );
    const transitionSegment = await createTransition(
      currentSegment,
      newsSegment,
    );

    return { transitionSegment, newsSegment };
  } else {
    const musicSegment: Segment = {
      segmentKind: "music",
      content: await getContentForNewMusicSegment(accessToken),
    };

    const musicIds = getMusicContent(musicSegment)?.map((track) => track.id);

    const transitionSegment = await createStart(musicSegment);

    return { transitionSegment, musicIds: musicIds ? musicIds : [] };
  }
};

const getContentForNewMusicSegment = async (accessToken: string) => {
  const nextSongs = await getSongs(accessToken);
  return nextSongs.map((song) => {
    const music: Music = {
      artistNames: song.artistNames ? song.artistNames : [],
      id: song.id,
    };
    return music;
  });
};

const getSongs = async (accessToken: string) => {
  const count = Math.floor(Math.random() * 4 + 1);
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

const getNews = async () => {
  const newsS = await db.select().from(news);
  const randomNews = newsS[Math.floor(Math.random() * newsS.length)];
  return randomNews;
};

export default mixer;

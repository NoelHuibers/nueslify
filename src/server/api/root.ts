import { postRouter } from "~/server/api/routers/post";
import { createTRPCRouter } from "~/server/api/trpc";
import { ttsRouter } from "./routers/tts";
import { gptRouter } from "~/server/api/routers/gptRouter";
import { spotifyRouter } from "./routers/topTracks";
import { playbackRouter } from "~/server/api/routers/playback";
import { mixerRouter } from "./routers/mixer";
import { newsRouter } from "./routers/news";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  tts: ttsRouter,
  gpt: gptRouter,
  spotify: spotifyRouter,
  playback: playbackRouter,
  mixer: mixerRouter,
  news: newsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

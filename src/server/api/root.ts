import { createTRPCRouter } from "~/server/api/trpc";
import { ttsRouter } from "./routers/tts";
import { gptRouter } from "~/server/api/routers/gptRouter";
import { spotifyRouter } from "./routers/topTracks";
import { playbackRouter } from "~/server/api/routers/playback";
import { mixerRouter } from "./routers/mixer";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  tts: ttsRouter, // TTS
  gpt: gptRouter, // GPT
  spotify: spotifyRouter, // Toptracks
  playback: playbackRouter,
  mixer: mixerRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

import { createTRPCRouter } from "~/server/api/trpc";
import { playbackRouter } from "~/server/api/routers/playback";
import { mixerRouter } from "./routers/mixer";
import { interestsRouter } from "./routers/interests";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  playback: playbackRouter,
  mixer: mixerRouter,
  interests: interestsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

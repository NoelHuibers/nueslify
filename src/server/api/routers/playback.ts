import { db } from "~/server/db";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { refreshSpotifyToken } from "~/utils/getTopTracks";
import WebPlayback from "~/pages/playback";

export const playbackRouter = createTRPCRouter({
  playback: protectedProcedure.query(async ({ ctx }) => {
    return await refreshSpotifyToken(ctx.session.user.id);
  }),
});

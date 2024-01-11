import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { refreshSpotifyToken } from "~/utils/getTopTracks";

export const playbackRouter = createTRPCRouter({
  playback: protectedProcedure.query(async ({ ctx }) => {
    return await refreshSpotifyToken(ctx.session.user.id);
  }),
});

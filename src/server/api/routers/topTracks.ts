import { db } from "~/server/db";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import getTopTracks, { refreshSpotifyToken } from "~/utils/getTopTracks";

export const spotifyRouter = createTRPCRouter({
  topTracks: protectedProcedure.query(async ({ ctx }) => {
    const account = await db.query.accounts.findFirst({
      where: (accounts, { eq }) => eq(accounts.userId, ctx.session.user.id),
    });

    if (!account) {
      throw new Error("No account found");
    }

    if (!account.access_token) {
      throw new Error("No access token found");
    }

    const accessToken = await refreshSpotifyToken(ctx.session.user.id);
    const result = getTopTracks(accessToken);
    return result;
  }),
});

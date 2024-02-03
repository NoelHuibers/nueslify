import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import mixer from "~/utils/mixer";
import { refreshSpotifyToken } from "~/utils/getTopTracks";
import { fetchUser } from "~/utils/getUserData";

const SegmentSchema = z
  .object({
    title: z.string().optional(),
    artistNames: z.array(z.string()).optional(),
    newscontent: z.string().optional(),
  })
  .optional();

export const mixerRouter = createTRPCRouter({
  mixer: protectedProcedure
    .input(SegmentSchema)
    .mutation(async ({ input = {}, ctx }) => {
      const { artistNames, title, newscontent } = input;
      const accessToken = await refreshSpotifyToken(ctx.session.user.id);
      const user = await fetchUser(ctx.session.user.id);
      const data = await mixer(
        title,
        artistNames,
        newscontent,
        accessToken,
        user,
      );
      return data;
    }),
});

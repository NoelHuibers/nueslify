import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { Segment } from "~/utils/GPT/GPT";
import mixer from "~/utils/mixer";
import { refreshSpotifyToken } from "~/utils/getTopTracks";

const MusicSchema = z.object({
  title: z.string(),
  artistNames: z.array(z.string()),
  id: z.number(),
});

const NewsSchema = z.object({
  content: z.string(),
});

const TransitionSchema = z.object({
  content: z.string(),
});

const SegmentSchema = z
  .object({
    segmentKind: z.enum(["music", "news", "transition"]),
    content: z.union([MusicSchema, NewsSchema, TransitionSchema]),
  })
  .optional();

export const mixerRouter = createTRPCRouter({
  mixer: protectedProcedure
    .input(SegmentSchema)
    .query(async ({ input, ctx }) => {
      const segment = input as Segment | null;
      const accessToken = await refreshSpotifyToken(ctx.session.user.id);
      const data = await mixer(segment, accessToken);
      return data;
    }),
});

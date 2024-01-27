import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { users } from "~/server/db/schema";

export const interestsRouter = createTRPCRouter({
  interests: protectedProcedure
    .input(
      z.object({
        age: z.number().min(18).max(100),
        country: z.string(),
        musicNewsAmount: z.number().min(0).max(100),
        hostStyle: z.string(),
        musicTerm: z.string(),
        //categories: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Perform the database update
      await db
        .update(users)
        .set({
          age: input.age,
          country: input.country,
          musicNewsBalance: input.musicNewsAmount,
          hostStyle: input.hostStyle,
          musicTerm: input.musicTerm,
          //categories: input.categories,
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true, message: "Interests updated successfully" };
    }),
});

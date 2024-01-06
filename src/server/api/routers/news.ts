import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import getNews from "~/utils/getNews";

export const newsRouter = createTRPCRouter({
    News: protectedProcedure.query(async () => {
        const result = await getNews();
        return result;
    }),
});
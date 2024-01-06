import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { OpenAIGPT } from "~/utils/GPT/OpenAIGPT"
import { GPT } from "~/utils/GPT/GPT"

const client: GPT = new OpenAIGPT()

export const gptRouter = createTRPCRouter({
    gptAnswer: publicProcedure.query( () => {
        const result = client.createNewsSummary("")
        return result;
    }),
});

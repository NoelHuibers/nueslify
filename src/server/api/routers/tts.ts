import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { textoSpeech } from "~/utils/ttsFunc";

export const ttsRouter = createTRPCRouter({
  ttsNew: protectedProcedure.query(() => {
    const result = textoSpeech();
    return result;
  }),
});

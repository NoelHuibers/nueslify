import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { textoSpeech } from "~/utils/ttsFunc";

export const ttsRouter = createTRPCRouter({
  ttsNew: publicProcedure.query( () => {
    const result = textoSpeech();
    return result;
  }),
});

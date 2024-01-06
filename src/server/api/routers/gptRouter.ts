import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createNewsSummary } from "~/utils/GPT/OpenAIGPT"
import { GPT } from "~/utils/GPT/GPT"

export const gptRouter = createTRPCRouter({
    gptAnswer: publicProcedure.query(() => {
        const result = createNewsSummary("Erst gestern hatte Hisbollah-Chef Hassan Nasrallah in seiner Rede deutlich gemacht: Die Tötung des Hamas-Funktionärs Saleh al-Aruri in Beirut werde nicht ohne Reaktion und Strafe bleiben. An diesem Morgen dann folgte die Reaktion: Mehr als 40 Raketen wurden von Hisbollah-Stellungen nach Israel abgefeuert. In zahlreichen Städten im Norden Israels herrschte Raketenalarm. Schon jetzt sind mehr als 70.000 Israelis aus ihren Dörfern und Städten entlang der Grenze zum Libanon und Syrien evakuiert worden. Auch Kiryat Schmona gleicht einer Geisterstadt. Ofir Yehezkeli, der stellvertretende Bürgermeister, bezeichnet die Situation als unhaltbar.")
        return result;
    }),
});

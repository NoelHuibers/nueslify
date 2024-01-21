import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createNewsSummary, createTransition } from "~/utils/GPT/OpenAIGPT";
import type { Segment } from "~/utils/GPT/GPT";

export const gptRouter = createTRPCRouter({
  gptAnswer: publicProcedure.query(() => {
    //const result = createNewsSummary("Erst gestern hatte Hisbollah-Chef Hassan Nasrallah in seiner Rede deutlich gemacht: Die Tötung des Hamas-Funktionärs Saleh al-Aruri in Beirut werde nicht ohne Reaktion und Strafe bleiben. An diesem Morgen dann folgte die Reaktion: Mehr als 40 Raketen wurden von Hisbollah-Stellungen nach Israel abgefeuert. In zahlreichen Städten im Norden Israels herrschte Raketenalarm. Schon jetzt sind mehr als 70.000 Israelis aus ihren Dörfern und Städten entlang der Grenze zum Libanon und Syrien evakuiert worden. Auch Kiryat Schmona gleicht einer Geisterstadt. Ofir Yehezkeli, der stellvertretende Bürgermeister, bezeichnet die Situation als unhaltbar.")
    const fromSegment: Segment = {
      segmentKind: "music",
      content: [
        {
          title: "Test1",
          artistNames: ["Artist 1", "Collaboration 1"],
          id: "1",
        },
        {
          title: "With a Little Help From My Friends",
          artistNames: ["The Beatles"],
          id: "2",
        },
      ],
    };

    const toSegment: Segment = {
      segmentKind: "news",
      content: {
        content: "Special news report, very nice",
      },
    };

    const result = createTransition(fromSegment, toSegment);
    return result;
  }),
});

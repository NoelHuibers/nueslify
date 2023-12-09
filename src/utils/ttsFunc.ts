import path from "path";
import OpenAI from "openai-api";
import fs from "fs";
import { env } from "~/env.mjs";

const openai = new OpenAI(env.OPENAI_API_KEY);

const speechFile = path.resolve("./speech.mp3");

export async function textoSpeech() {
  //ts-ignore[2339]
  const mp3 = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: "fable",
    input:
      "The German producer price index slides for fourth month in a row on the back of shrinking energy and metal prices. Germany’s producer price index for October slid 11% year-on-year, as expected by analysts, further extending September 14.7% decline.",
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);
}

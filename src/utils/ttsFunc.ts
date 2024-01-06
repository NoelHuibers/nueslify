import OpenAI from "openai";
import fs from "fs";
import { env } from "~/env.mjs";
import { promisify } from "util";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function textoSpeech(text: string) {
  // For Actual usage:

  // const mp3 = await openai.audio.speech.create({
  //   model: "tts-1",
  //   voice: "fable",
  //   input:
  //     text,
  // });

  // For Mockdata:

  const filePath =
    env.NODE_ENV === "production" ? "/speech.mp3" : "./public/speech.mp3";
  const mp3 = await readMp3File(filePath);

  const buffer = Buffer.from(await mp3.arrayBuffer());
  const binaryString = buffer.toString("binary");
  return binaryString;
}

async function readMp3File(filePath: string): Promise<Response> {
  const readFileAsync = promisify(fs.readFile);
  try {
    const buffer = await readFileAsync(filePath);

    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );

    return new Response(arrayBuffer);
  } catch (error) {
    console.error("Error reading .mp3 file:", error);
    throw error;
  }
}

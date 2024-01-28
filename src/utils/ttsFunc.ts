import OpenAI from "openai";
import { env } from "~/env.mjs";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export function textoSpeech(text: string) {
  // const mp3 = await openai.audio.speech.create({
  //   model: "tts-1",
  //   voice: "fable",
  //   input: text,
  // });

  // const buffer = Buffer.from(await mp3.arrayBuffer());

  const name = "Test3.mp3";

  // uploadBufferToS3("nueslify", name, buffer)
  //   .then((response) => console.log("Upload erfolgreich:", response))
  //   .catch((error) => console.error("Fehler beim Upload:", error));
  return "https://nueslify.s3.eu-central-1.amazonaws.com/" + name;
}

const s3 = new S3Client([
  {
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },
]);

async function uploadBufferToS3(
  bucketName: string,
  key: string,
  buffer: Buffer,
) {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
  };

  try {
    const response = await s3.send(new PutObjectCommand(params));
    console.log("Datei erfolgreich hochgeladen:", response);
    return response;
  } catch (error) {
    console.error("Fehler beim Hochladen der Datei:", error);
    throw error;
  }
}

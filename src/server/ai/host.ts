import { generateSpeech, generateText } from "ai";
import type { AiProvider, HostStyle, Language, Voice } from "#/lib/domain.ts";
import { silentWav } from "#/lib/wav.ts";
import { logger } from "#/server/logger.ts";
import { resolveSpeechModel, resolveTextModel } from "./models.ts";
import {
  describeItem,
  formatList,
  type ListenerContext,
  partOfDay,
  type ScriptRequest,
  SPOKEN_STATION_NAME,
  type StoryContext,
  speechInstructions,
  systemPrompt,
  userPrompt,
} from "./prompts.ts";
import { sanitizeForSpeech } from "./sanitize.ts";

const MAX_SCRIPT_LENGTH: Record<ScriptRequest["kind"], number> = {
  intro: 600,
  bridge: 400,
  news: 1600,
};

export async function writeScript(
  request: ScriptRequest,
  listener: ListenerContext,
  provider: AiProvider,
): Promise<string> {
  const resolved = resolveTextModel(provider);
  if (!resolved) {
    return mockScript(request, listener);
  }
  const { text } = await generateText({
    model: resolved.model,
    system: systemPrompt(listener),
    prompt: userPrompt(request),
    maxRetries: 2,
    timeout: 45_000,
  });
  const script = sanitizeForSpeech(text, MAX_SCRIPT_LENGTH[request.kind]);
  if (!script) {
    logger.warn("model returned an empty script", {
      kind: request.kind,
      provider: resolved.provider,
    });
    return mockScript(request, listener);
  }
  return script;
}

export type SynthesizedAudio = { audio: Uint8Array; mimeType: string; extension: string };

export async function synthesize(
  text: string,
  options: { voice: Voice; style: HostStyle; language: Language },
): Promise<SynthesizedAudio> {
  const resolved = resolveSpeechModel();
  if (!resolved) {
    return { audio: silentWav(mockDurationMs(text)), mimeType: "audio/wav", extension: "wav" };
  }
  const { audio } = await generateSpeech({
    model: resolved.model,
    text,
    voice: resolved.voice(options.voice),
    instructions: speechInstructions(options.style, options.language),
    language: options.language,
    outputFormat: "mp3",
    maxRetries: 2,
  });
  const mimeType = audio.mediaType || "audio/mpeg";
  return {
    audio: audio.uint8Array,
    mimeType,
    extension: mimeType.includes("wav") ? "wav" : "mp3",
  };
}

/** Rough speaking time of the text, kept short so the mock show moves along quickly. */
export function mockDurationMs(text: string): number {
  return Math.min(6000, 1500 + text.length * 8);
}

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;

function englishGreeting(now: Date): string {
  const part = partOfDay(now);
  // "Good night" is a farewell, not a greeting.
  return part === "night" ? "Hey there" : `Good ${part}`;
}

function mockNews(story: StoryContext, german: boolean): string {
  const lead = story.body.split(SENTENCE_BOUNDARY).slice(0, 2).join(" ");
  const others = formatList(story.others.map((other) => other.source));
  const credit = german
    ? `Quelle: ${story.source}.${others ? ` Auch ${others} berichten darüber.` : ""}`
    : `That's according to ${story.source}.${others ? ` ${others} reported it too.` : ""}`;
  return `${story.title}. ${lead} ${credit}`;
}

/** Deterministic, offline stand-in for the language model. */
export function mockScript(request: ScriptRequest, listener: ListenerContext): string {
  const german = listener.language === "de";
  switch (request.kind) {
    case "intro": {
      const greeting = german ? "Hallo" : englishGreeting(listener.now);
      return german
        ? `${greeting} ${listener.name ?? ""}, hier ist ${SPOKEN_STATION_NAME}, dein persönliches Radio. Los geht's mit ${describeItem(request.next)}.`
        : `${greeting}, ${listener.name ?? "friend"}! This is ${SPOKEN_STATION_NAME}, your very own radio station. Let's kick things off with ${describeItem(request.next)}.`;
    }
    case "bridge":
      return german
        ? `Das war ${describeItem(request.from)}. Weiter geht's mit ${describeItem(request.to)}.`
        : `That was ${describeItem(request.from)}. Coming up next: ${describeItem(request.to)}.`;
    case "news":
      return mockNews(request.story, german);
    default:
      return "";
  }
}

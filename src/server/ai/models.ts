import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel, SpeechModel } from "ai";
import type { AiProvider, Voice } from "#/lib/domain.ts";
import { env } from "#/server/env.ts";

const openai = env.OPENAI_API_KEY ? createOpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const google = env.GOOGLE_GENERATIVE_AI_API_KEY
  ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })
  : null;

export type ResolvedTextModel = { provider: AiProvider; model: LanguageModel } | null;

/** The listener's preferred provider, falling back to whichever one is configured. */
export function resolveTextModel(preferred: AiProvider): ResolvedTextModel {
  if (env.AI_MOCK) {
    return null;
  }
  const order: AiProvider[] = preferred === "google" ? ["google", "openai"] : ["openai", "google"];
  for (const provider of order) {
    if (provider === "openai" && openai) {
      return { provider, model: openai(env.OPENAI_TEXT_MODEL) };
    }
    if (provider === "google" && google) {
      return { provider, model: google(env.GOOGLE_TEXT_MODEL) };
    }
  }
  return null;
}

/** Gemini TTS has its own voice catalogue; map ours onto voices with a similar character. */
const GEMINI_VOICES: Record<Voice, string> = {
  fable: "Puck",
  nova: "Leda",
  onyx: "Charon",
  coral: "Aoede",
  sage: "Kore",
  ash: "Fenrir",
};

export type ResolvedSpeechModel = {
  provider: AiProvider;
  model: SpeechModel;
  voice: (voice: Voice) => string;
} | null;

export function resolveSpeechModel(): ResolvedSpeechModel {
  if (env.AI_MOCK) {
    return null;
  }
  if (openai) {
    return { provider: "openai", model: openai.speech(env.OPENAI_TTS_MODEL), voice: (v) => v };
  }
  if (google) {
    return {
      provider: "google",
      model: google.speech("gemini-2.5-flash-preview-tts"),
      voice: (v) => GEMINI_VOICES[v],
    };
  }
  return null;
}

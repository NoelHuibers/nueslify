import process from "node:process";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const flag = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((value) => value === "true" || value === "1");

const raw = process.env;
const isProduction = raw["NODE_ENV"] === "production";
/** On Vercel (build and runtime) a local database file would silently vanish. */
const isDeployed = isProduction || Boolean(raw["VERCEL"]);

/** The URL Vercel serves this deployment on, so auth works without setting BETTER_AUTH_URL. */
function vercelUrl(source: NodeJS.ProcessEnv): string | undefined {
  const host =
    source["VERCEL_ENV"] === "production"
      ? source["VERCEL_PROJECT_PRODUCTION_URL"]
      : (source["VERCEL_BRANCH_URL"] ?? source["VERCEL_URL"]);
  return host ? `https://${host}` : undefined;
}

/**
 * Accepts the variable names of the previous (Next.js) deployment, so an existing Vercel
 * project keeps working, and picks storage that works on serverless hosts without a disk.
 */
export function withFallbacks(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const pick = (...names: string[]) => names.map((name) => source[name]).find(Boolean);
  const serverlessStorage = source["VERCEL"] ? "database" : undefined;
  return {
    ...source,
    DATABASE_URL: pick("DATABASE_URL", "TURSO_DATABASE_URL"),
    DATABASE_AUTH_TOKEN: pick("DATABASE_AUTH_TOKEN", "TURSO_AUTH_TOKEN"),
    BETTER_AUTH_SECRET: pick("BETTER_AUTH_SECRET", "NEXTAUTH_SECRET"),
    BETTER_AUTH_URL: pick("BETTER_AUTH_URL") ?? vercelUrl(source),
    S3_ACCESS_KEY_ID: pick("S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"),
    S3_SECRET_ACCESS_KEY: pick("S3_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY"),
    S3_REGION: pick("S3_REGION", "AWS_REGION"),
    STORAGE_DRIVER: pick("STORAGE_DRIVER") ?? (source["S3_BUCKET"] ? "s3" : serverlessStorage),
  };
}

/**
 * Server-only environment. Never import this from code that ships to the browser —
 * public configuration is exposed explicitly via `getPublicConfig`.
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    DATABASE_URL: isDeployed ? z.string() : z.string().default("file:.data/dev.db"),
    DATABASE_AUTH_TOKEN: z.string().optional(),

    BETTER_AUTH_URL: z.url().default("http://127.0.0.1:3210"),
    BETTER_AUTH_SECRET: isProduction
      ? z.string().min(32)
      : z.string().min(32).default("dev-only-secret-change-me-dev-only-secret"),

    SPOTIFY_CLIENT_ID: z.string().optional(),
    SPOTIFY_CLIENT_SECRET: z.string().optional(),

    /** Google OAuth client — enables YouTube Music (youtube.readonly) as a music source. */
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    TIDAL_CLIENT_ID: z.string().optional(),
    TIDAL_CLIENT_SECRET: z.string().optional(),
    /** MusicKit key from an Apple Developer Program membership. */
    APPLE_MUSIC_TEAM_ID: z.string().optional(),
    APPLE_MUSIC_KEY_ID: z.string().optional(),
    /** PKCS#8 PEM contents of the MusicKit .p8 key (newlines may be escaped as \\n). */
    APPLE_MUSIC_PRIVATE_KEY: z.string().optional(),
    JAMENDO_CLIENT_ID: z.string().optional(),
    AUDIUS_APP_NAME: z.string().default("nueslify"),
    AUDIUS_DISABLED: flag,
    /** "fixture" swaps the free catalogue for bundled demo tones (tests, offline demos). */
    MUSIC_CATALOG: z.enum(["live", "fixture"]).default("live"),

    OPENAI_API_KEY: z.string().optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
    OPENAI_TEXT_MODEL: z.string().default("gpt-5.4-mini"),
    GOOGLE_TEXT_MODEL: z.string().default("gemini-flash-latest"),
    OPENAI_TTS_MODEL: z.string().default("gpt-4o-mini-tts"),
    /** Use deterministic fake AI (text + silent audio). Handy for local dev and e2e tests. */
    AI_MOCK: flag,

    // "live" fetches every outlet; "fixture" uses bundled snapshots ("tagesschau" is the old name of "live").
    NEWS_SOURCE: z.enum(["live", "tagesschau", "fixture"]).default("live"),

    /** "database" keeps audio in the database: zero setup, fine for small deployments. */
    STORAGE_DRIVER: z.enum(["local", "s3", "database"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default(".data/audio"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_ENDPOINT: z.url().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    /** Public base URL that serves the bucket, e.g. https://cdn.example.com */
    S3_PUBLIC_URL: z.url().optional(),

    /** Turns off auth rate limiting. Only for automated end-to-end tests. */
    DISABLE_RATE_LIMIT: flag,

    /** Without it (or shorter than 16 characters) the cron endpoint stays locked. */
    CRON_SECRET: z.string().optional(),
  },
  runtimeEnv: withFallbacks(raw),
  emptyStringAsUndefined: true,
  skipValidation: raw["SKIP_ENV_VALIDATION"] === "true",
});

export const spotifyConfigured = Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);

export const aiMocked = env.AI_MOCK || !(env.OPENAI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY);

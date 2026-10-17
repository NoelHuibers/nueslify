import { relations, sql } from "drizzle-orm";
import {
  blob,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type {
  AiProvider,
  CategoryId,
  HostStyle,
  Language,
  MusicRange,
  Voice,
} from "#/lib/domain.ts";
import type { GenreId, MusicProviderId, MusicSourceChoice } from "#/lib/music.ts";
import type { NewsSourceId } from "#/lib/news/sources.ts";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = (name = "created_at") =>
  timestamp(name).notNull().default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`);
const updatedAt = () =>
  timestamp("updated_at")
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date());

/* -------------------------------------------------------------------------- */
/*                         Better Auth (core schema)                          */
/* -------------------------------------------------------------------------- */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("account_user_id_idx").on(t.userId),
    uniqueIndex("account_provider_account_idx").on(t.providerId, t.accountId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* -------------------------------------------------------------------------- */
/*                                  Nueslify                                   */
/* -------------------------------------------------------------------------- */

export const preferences = sqliteTable("preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull().default(""),
  language: text("language").$type<Language>().notNull().default("en"),
  hostStyle: text("host_style").$type<HostStyle>().notNull().default("friendly"),
  voice: text("voice").$type<Voice>().notNull().default("fable"),
  aiProvider: text("ai_provider").$type<AiProvider>().notNull().default("openai"),
  musicRange: text("music_range").$type<MusicRange>().notNull().default("medium_term"),
  balance: integer("balance").notNull().default(50),
  categories: text("categories", { mode: "json" })
    .$type<CategoryId[]>()
    .notNull()
    .default(sql`'["inland","ausland","wirtschaft"]'`),
  regionId: integer("region_id"),
  mentionTracks: integer("mention_tracks", { mode: "boolean" }).notNull().default(true),
  musicSource: text("music_source").$type<MusicSourceChoice>().notNull().default("auto"),
  genres: text("genres", { mode: "json" }).$type<GenreId[]>().notNull().default(sql`'[]'`),
  newsSources: text("news_sources", { mode: "json" })
    .$type<NewsSourceId[]>()
    .notNull()
    .default(sql`'["tagesschau"]'`),
  onboardedAt: timestamp("onboarded_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const story = sqliteTable(
  "story",
  {
    /** tagesschau `externalId`, or `<source>:<hash of the canonical URL>` for RSS stories. */
    id: text("id").primaryKey(),
    sourceId: text("source_id").$type<NewsSourceId>().notNull().default("tagesschau"),
    /** Stories about the same event share a cluster; its first story's id names it. */
    clusterId: text("cluster_id").notNull().default(""),
    ressort: text("ressort"),
    regionId: integer("region_id"),
    title: text("title").notNull(),
    topline: text("topline"),
    firstSentence: text("first_sentence"),
    body: text("body").notNull(),
    shareUrl: text("share_url").notNull(),
    breaking: integer("breaking", { mode: "boolean" }).notNull().default(false),
    publishedAt: timestamp("published_at").notNull(),
    ingestedAt: createdAt("ingested_at"),
  },
  (t) => [
    index("story_published_at_idx").on(t.publishedAt),
    index("story_ressort_published_idx").on(t.ressort, t.publishedAt),
    index("story_region_published_idx").on(t.regionId, t.publishedAt),
    index("story_source_published_idx").on(t.sourceId, t.publishedAt),
    index("story_cluster_idx").on(t.clusterId),
  ],
);

export type ClipKind = "intro" | "bridge" | "news";

/** Generated host audio. News clips are shared between listeners via `cacheKey`. */
export const clip = sqliteTable(
  "clip",
  {
    id: text("id").primaryKey(),
    kind: text("kind").$type<ClipKind>().notNull(),
    cacheKey: text("cache_key"),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    storyId: text("story_id").references(() => story.id, { onDelete: "cascade" }),
    transcript: text("transcript").notNull(),
    storageKey: text("storage_key").notNull(),
    url: text("url").notNull(),
    mimeType: text("mime_type").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("clip_cache_key_idx").on(t.cacheKey),
    index("clip_created_at_idx").on(t.createdAt),
  ],
);

/** Stories a listener has been served, used for "don't repeat" and the history page. */
export const listen = sqliteTable(
  "listen",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storyId: text("story_id")
      .notNull()
      .references(() => story.id, { onDelete: "cascade" }),
    clipId: text("clip_id").references(() => clip.id, { onDelete: "set null" }),
    servedAt: createdAt("served_at"),
  },
  (t) => [
    index("listen_user_served_idx").on(t.userId, t.servedAt),
    uniqueIndex("listen_user_story_idx").on(t.userId, t.storyId),
  ],
);

export const savedStory = sqliteTable(
  "saved_story",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    storyId: text("story_id")
      .notNull()
      .references(() => story.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.storyId] })],
);

/**
 * Music services connected without OAuth (Apple Music hands out a "Music User Token" in the
 * browser). OAuth-based services live in Better Auth's `account` table instead.
 */
export const musicConnection = sqliteTable(
  "music_connection",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").$type<MusicProviderId>().notNull(),
    /** Encrypted with BETTER_AUTH_SECRET. */
    token: text("token").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.provider] })],
);

/**
 * Per-feed fetch state: HTTP validators for conditional requests and exponential backoff for
 * feeds that keep failing, so a broken outlet never slows down everyone else's show.
 */
export const feedState = sqliteTable("feed_state", {
  key: text("key").primaryKey(),
  etag: text("etag"),
  lastModified: text("last_modified"),
  /** Last successful fetch (200 or 304). */
  fetchedAt: timestamp("fetched_at"),
  failures: integer("failures").notNull().default(0),
  retryAt: timestamp("retry_at"),
  updatedAt: updatedAt(),
});

/**
 * Audio bytes for STORAGE_DRIVER=database: zero-setup storage for serverless hosts without a
 * bucket. Clips are small (≈ 0.5 MB per minute) and pruned with their `clip` rows.
 */
export const audioObject = sqliteTable("audio_object", {
  key: text("key").primaryKey(),
  contentType: text("content_type").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  createdAt: createdAt(),
});

/** Small key/value table for operational state (e.g. last news ingest). */
export const appState = sqliteTable("app_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: updatedAt(),
});

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  preferences: one(preferences),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const listenRelations = relations(listen, ({ one }) => ({
  story: one(story, { fields: [listen.storyId], references: [story.id] }),
  clip: one(clip, { fields: [listen.clipId], references: [clip.id] }),
}));

export const savedStoryRelations = relations(savedStory, ({ one }) => ({
  story: one(story, { fields: [savedStory.storyId], references: [story.id] }),
}));

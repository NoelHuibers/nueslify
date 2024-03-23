import { relations, sql } from "drizzle-orm";
import {
  int,
  text,
  primaryKey,
  sqliteTableCreator,
  index,
} from "drizzle-orm/sqlite-core";
import { type AdapterAccount } from "next-auth/adapters";

export const createTable = sqliteTableCreator((name) => `nueslify_${name}`);

export const users = createTable("user", {
  id: text("id", { length: 255 }).notNull().primaryKey(),
  name: text("name", { length: 255 }),
  email: text("email", { length: 255 }).notNull(),
  emailVerified: int("emailVerified", {
    mode: "timestamp",
  }).default(sql`CURRENT_TIMESTAMP`),
  image: text("image", { length: 511 }),
  age: int("age"),
  state: text("state", { length: 255 }),
  musicNewsBalance: int("musicNewsBalance"),
  ai: text("ai", { length: 255 }),
  hostStyle: text("hostStyle", { length: 255 }),
  musicTerm: text("musicTerm", { length: 255 }),
  categories: text("categories", { length: 1024 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accounts = createTable(
  "account",
  {
    userId: text("userId", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: text("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: text("provider", { length: 255 }).notNull(),
    providerAccountId: text("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
    token_type: text("token_type", { length: 255 }),
    scope: text("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: text("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_userId_idx").on(account.userId),
  }),
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  {
    sessionToken: text("sessionToken", { length: 255 }).notNull().primaryKey(),
    userId: text("userId", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: int("expires", { mode: "timestamp" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_userId_idx").on(session.userId),
  }),
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const news = createTable(
  "news",
  {
    id: int("id", { mode: "number" }).primaryKey(),
    externalId: text("externalId", { length: 255 }).notNull(),
    regionId: int("regionId").notNull(),
    ressort: text("ressort", { length: 255 }),
    title: text("title", { length: 255 }).notNull(),
    shareurl: text("shareurl", { length: 255 }).notNull(),
    firstline: text("firstline", { length: 255 }),
    details: text("details"),
  },
  (news) => ({
    externalIdIndex: index("externalId_idx").on(news.externalId),
    ressortIndex: index("ressort_idx").on(news.ressort),
    regionId: index("regionId_idx").on(news.regionId),
    title: index("topline_idx").on(news.title),
    shareurlIndex: index("shareurl_idx").on(news.shareurl),
    firstlineIndex: index("firstline_idx").on(news.firstline),
    detailsIndex: index("details_idx").on(news.details),
  }),
);

export const verificationTokens = createTable(
  "verificationToken",
  {
    identifier: text("identifier", { length: 255 }).notNull(),
    token: text("token", { length: 255 }).notNull(),
    expires: int("expires", { mode: "timestamp" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

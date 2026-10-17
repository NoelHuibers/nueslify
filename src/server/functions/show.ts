import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "#/server/db/client.ts";
import { tracksFor } from "#/server/music/registry.ts";
import { newsSource } from "#/server/news/index.ts";
import { buildShowBlock } from "#/server/show/builder.ts";
import { authMiddleware } from "./middleware.ts";

const text = (max: number) => z.string().trim().min(1).max(max);

export const previousItemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("nothing") }),
  z.object({
    kind: z.literal("track"),
    name: text(200),
    artists: z.array(text(120)).min(1).max(8),
  }),
  z.object({ kind: z.literal("music"), count: z.number().int().min(1).max(10) }),
  z.object({ kind: z.literal("story"), title: text(300), topline: text(200).nullable() }),
]);

export const nextBlockInput = z.object({
  index: z.number().int().min(0).max(10_000),
  previous: previousItemSchema,
  recentTrackIds: z.array(z.string().regex(/^[\w-]{1,64}$/)).max(200),
});

export const getNextBlock = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(nextBlockInput)
  .handler(async ({ context, data }) =>
    buildShowBlock(
      { db, newsSource: newsSource(), music: (request) => tracksFor(request) },
      { userId: context.user.id, ...data },
    ),
  );

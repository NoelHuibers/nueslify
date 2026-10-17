import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";
import { db } from "#/server/db/client.ts";
import { aiMocked, env } from "#/server/env.ts";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.run(sql`select 1`);
          // Coarse configuration facts (no secrets) to verify a deployment at a glance.
          return Response.json(
            {
              ok: true,
              database: env.DATABASE_URL.startsWith("file:") ? "file" : "remote",
              storage: env.STORAGE_DRIVER,
              ai: aiMocked ? "demo" : "live",
              cron: (env.CRON_SECRET ?? "").length >= 16,
            },
            { headers: { "cache-control": "no-store" } },
          );
        } catch {
          return Response.json(
            { ok: false },
            { status: 503, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});

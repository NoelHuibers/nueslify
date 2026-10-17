import { createServerFn } from "@tanstack/react-start";
import { preferencesSchema } from "#/lib/domain.ts";
import { db } from "#/server/db/client.ts";
import { loadPreferences, savePreferences } from "#/server/preferences.ts";
import { authMiddleware } from "./middleware.ts";

export const getPreferences = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => loadPreferences(db, context.user.id));

export const updatePreferences = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(preferencesSchema)
  .handler(async ({ context, data }) => {
    await savePreferences(db, context.user.id, data);
    return { ok: true as const };
  });

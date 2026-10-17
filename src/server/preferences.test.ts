import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "#/lib/domain.ts";
import { createTestDb, createUser } from "../../test/db.ts";
import { loadPreferences, savePreferences } from "./preferences.ts";

describe("preferences", () => {
  it("creates defaults on first load, using the first name", async () => {
    const db = await createTestDb();
    const userId = await createUser(db, "u1", "Ada Lovelace");

    const prefs = await loadPreferences(db, userId);
    expect(prefs).toEqual({ ...DEFAULT_PREFERENCES, displayName: "Ada", onboarded: false });

    // Second load returns the same row instead of inserting again.
    await expect(loadPreferences(db, userId)).resolves.toEqual(prefs);
  });

  it("saves and marks the listener as onboarded", async () => {
    const db = await createTestDb();
    const userId = await createUser(db);
    const next = {
      ...DEFAULT_PREFERENCES,
      displayName: "Noel",
      language: "de" as const,
      balance: 80,
      categories: ["sport" as const],
      regionId: 9,
      mentionTracks: false,
    };

    await savePreferences(db, userId, next);
    await expect(loadPreferences(db, userId)).resolves.toEqual({ ...next, onboarded: true });
  });
});

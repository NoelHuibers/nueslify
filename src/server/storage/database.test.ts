import { describe, expect, it } from "vitest";
import { createTestDb } from "../../../test/db.ts";
import { createDatabaseStorage, readDatabaseObject } from "./database.ts";

describe("database storage", () => {
  it("stores, serves and deletes audio", async () => {
    const db = await createTestDb();
    const storage = createDatabaseStorage(db, "/api/audio");
    const bytes = new Uint8Array([82, 73, 70, 70, 1, 2, 3]);

    const stored = await storage.put("clips/2026-10-17/a.wav", bytes, "audio/wav");
    expect(stored).toEqual({
      key: "clips/2026-10-17/a.wav",
      url: "/api/audio/clips/2026-10-17/a.wav",
    });
    const object = await readDatabaseObject(db, "clips/2026-10-17/a.wav");
    expect(object?.size).toBe(7);
    expect([...(object?.data ?? [])]).toEqual([...bytes]);

    await storage.delete(["clips/2026-10-17/a.wav"]);
    expect(await readDatabaseObject(db, "clips/2026-10-17/a.wav")).toBeNull();
    expect(await readDatabaseObject(db, "../etc/passwd")).toBeNull();
  });
});

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalStorage, readLocalObject, resolveKey } from "./local.ts";

describe("resolveKey", () => {
  const root = "/srv/audio";

  it("resolves keys inside the root", () => {
    expect(resolveKey(root, "clips/2026-10-16/a.mp3")).toBe("/srv/audio/clips/2026-10-16/a.mp3");
  });

  it.each(["../etc/passwd", "clips/../../etc/passwd", "/etc/passwd", "clips/a b.mp3", "", "."])(
    "rejects %j",
    (key) => {
      expect(resolveKey(root, key)).toBeNull();
    },
  );
});

describe("local storage", () => {
  it("round-trips objects and deletes them", async () => {
    const directory = mkdtempSync(join(tmpdir(), "nueslify-storage-"));
    const storage = createLocalStorage({ directory, publicPath: "/api/audio" });
    const body = new TextEncoder().encode("hello");

    const stored = await storage.put("clips/x/test.mp3", body, "audio/mpeg");
    expect(stored).toEqual({ key: "clips/x/test.mp3", url: "/api/audio/clips/x/test.mp3" });

    const read = await readLocalObject(directory, "clips/x/test.mp3");
    expect(read?.size).toBe(5);
    expect(new TextDecoder().decode(read?.data)).toBe("hello");

    await storage.delete(["clips/x/test.mp3", "../outside"]);
    await expect(readLocalObject(directory, "clips/x/test.mp3")).resolves.toBeNull();
  });

  it("refuses unsafe keys on write", async () => {
    const directory = mkdtempSync(join(tmpdir(), "nueslify-storage-"));
    const storage = createLocalStorage({ directory, publicPath: "/api/audio" });
    await expect(storage.put("../escape.mp3", new Uint8Array(1), "audio/mpeg")).rejects.toThrow(
      /Invalid storage key/,
    );
  });
});

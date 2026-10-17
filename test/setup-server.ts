import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";

// Deterministic, offline server environment for every server test.
process.env["NODE_ENV"] = "test";
process.env["AI_MOCK"] = "true";
process.env["NEWS_SOURCE"] = "fixture";
process.env["DATABASE_URL"] = ":memory:";
process.env["STORAGE_DRIVER"] = "local";
process.env["STORAGE_LOCAL_DIR"] = mkdtempSync(join(tmpdir(), "nueslify-audio-"));

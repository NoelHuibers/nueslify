import { describe, expect, it } from "vitest";
import { withFallbacks } from "./env.ts";

describe("withFallbacks", () => {
  it("accepts the previous deployment's variable names", () => {
    const env = withFallbacks({
      TURSO_DATABASE_URL: "libsql://db.turso.io",
      TURSO_AUTH_TOKEN: "token",
      NEXTAUTH_SECRET: "s".repeat(40),
      AWS_ACCESS_KEY_ID: "key",
      AWS_SECRET_ACCESS_KEY: "secret",
      AWS_REGION: "eu-central-1",
    });
    expect(env).toMatchObject({
      DATABASE_URL: "libsql://db.turso.io",
      DATABASE_AUTH_TOKEN: "token",
      BETTER_AUTH_SECRET: "s".repeat(40),
      S3_ACCESS_KEY_ID: "key",
      S3_SECRET_ACCESS_KEY: "secret",
      S3_REGION: "eu-central-1",
    });
  });

  it("prefers the new names", () => {
    const env = withFallbacks({ DATABASE_URL: "file:a.db", TURSO_DATABASE_URL: "libsql://b" });
    expect(env["DATABASE_URL"]).toBe("file:a.db");
  });

  it("derives the auth URL and serverless storage on Vercel", () => {
    const production = withFallbacks({
      VERCEL: "1",
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "nueslify.vercel.app",
      VERCEL_URL: "nueslify-abc123.vercel.app",
    });
    expect(production).toMatchObject({
      BETTER_AUTH_URL: "https://nueslify.vercel.app",
      STORAGE_DRIVER: "database",
    });
    const preview = withFallbacks({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: "nueslify-git-feature.vercel.app",
      S3_BUCKET: "audio",
    });
    expect(preview).toMatchObject({
      BETTER_AUTH_URL: "https://nueslify-git-feature.vercel.app",
      STORAGE_DRIVER: "s3",
    });
  });

  it("leaves local development alone", () => {
    const env = withFallbacks({});
    expect(env["STORAGE_DRIVER"]).toBeUndefined();
    expect(env["BETTER_AUTH_URL"]).toBeUndefined();
  });
});

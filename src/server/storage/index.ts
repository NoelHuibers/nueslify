import { db } from "#/server/db/client.ts";
import { env } from "#/server/env.ts";
import { createDatabaseStorage } from "./database.ts";
import { createLocalStorage } from "./local.ts";
import { createS3Storage } from "./s3.ts";

const AUDIO_PATH = "/api/audio";

export type StoredObject = { key: string; url: string };

export type ObjectStorage = {
  put: (key: string, body: Uint8Array, contentType: string) => Promise<StoredObject>;
  delete: (keys: readonly string[]) => Promise<void>;
};

function createStorage(): ObjectStorage {
  if (env.STORAGE_DRIVER === "s3") {
    const { S3_BUCKET, S3_PUBLIC_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;
    if (!(S3_BUCKET && S3_PUBLIC_URL && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)) {
      throw new Error(
        "STORAGE_DRIVER=s3 requires S3_BUCKET, S3_PUBLIC_URL, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY",
      );
    }
    return createS3Storage({
      bucket: S3_BUCKET,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
      publicUrl: S3_PUBLIC_URL,
    });
  }
  if (env.STORAGE_DRIVER === "database") {
    return createDatabaseStorage(db, AUDIO_PATH);
  }
  return createLocalStorage({ directory: env.STORAGE_LOCAL_DIR, publicPath: AUDIO_PATH });
}

let instance: ObjectStorage | undefined;

export function storage(): ObjectStorage {
  instance ??= createStorage();
  return instance;
}

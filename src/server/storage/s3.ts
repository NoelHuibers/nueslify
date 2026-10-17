import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chunk } from "#/lib/async.ts";
import type { ObjectStorage } from "./index.ts";

const TRAILING_SLASHES = /\/+$/;

/** Works with AWS S3, Cloudflare R2, MinIO and other S3-compatible stores. */
export function createS3Storage(options: {
  bucket: string;
  region: string;
  endpoint: string | undefined;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}): ObjectStorage {
  const client = new S3Client({
    region: options.region,
    ...(options.endpoint ? { endpoint: options.endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });
  const base = options.publicUrl.replace(TRAILING_SLASHES, "");

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      return { key, url: `${base}/${key}` };
    },
    async delete(keys) {
      await Promise.all(
        chunk(keys, 1000).map((batch) =>
          client.send(
            new DeleteObjectsCommand({
              Bucket: options.bucket,
              Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
            }),
          ),
        ),
      );
    },
  };
}

import { createFileRoute } from "@tanstack/react-router";
import { db } from "#/server/db/client.ts";
import { env } from "#/server/env.ts";
import { audioContentType, parseRange } from "#/server/http.ts";
import { readDatabaseObject } from "#/server/storage/database.ts";
import { readLocalObject } from "#/server/storage/local.ts";

function readObject(key: string) {
  switch (env.STORAGE_DRIVER) {
    case "local":
      return readLocalObject(env.STORAGE_LOCAL_DIR, key);
    case "database":
      return readDatabaseObject(db, key);
    default:
      return Promise.resolve(null);
  }
}

/**
 * Serves audio kept on local disk or in the database (S3 serves its own). Supports HTTP range
 * requests, which Safari requires for <audio> playback and seeking.
 */
export const Route = createFileRoute("/api/audio/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const key = params._splat ?? "";
        const object = await readObject(key);
        if (!object) {
          return new Response("Not found", { status: 404 });
        }
        const headers = new Headers({
          "accept-ranges": "bytes",
          "cache-control": "private, max-age=86400, immutable",
          "content-type": audioContentType(key),
        });
        const range = parseRange(request.headers.get("range"), object.size);
        if (range === "invalid") {
          headers.set("content-range", `bytes */${object.size}`);
          return new Response(null, { status: 416, headers });
        }
        if (range) {
          headers.set("content-range", `bytes ${range.start}-${range.end}/${object.size}`);
          headers.set("content-length", String(range.end - range.start + 1));
          return new Response(object.data.slice(range.start, range.end + 1), {
            status: 206,
            headers,
          });
        }
        headers.set("content-length", String(object.size));
        return new Response(object.data, { status: 200, headers });
      },
    },
  },
});

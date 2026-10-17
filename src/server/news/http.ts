import type { Validators } from "./types.ts";

export const USER_AGENT = "Nueslify/2.0 (+https://github.com/NoelHuibers/nueslify)";
const TIMEOUT_MS = 10_000;
/** Feeds are a few hundred kB at most; anything far bigger is not a feed. */
const MAX_BYTES = 5_000_000;

export class FeedHttpError extends Error {
  readonly status: number;

  constructor(status: number, url: string) {
    super(`Feed responded ${status} for ${url}`);
    this.name = "FeedHttpError";
    this.status = status;
  }
}

export type ConditionalResponse =
  | { status: "not-modified" }
  | { status: "ok"; body: string; validators: Validators };

/** GET with If-None-Match / If-Modified-Since, so unchanged feeds cost a 304 and no parsing. */
export async function conditionalGet(
  fetchImpl: typeof fetch,
  url: string,
  validators: Validators,
  accept: string,
): Promise<ConditionalResponse> {
  const headers = new Headers({ accept, "user-agent": USER_AGENT });
  if (validators.etag) {
    headers.set("if-none-match", validators.etag);
  }
  if (validators.lastModified) {
    headers.set("if-modified-since", validators.lastModified);
  }
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (response.status === 304) {
    return { status: "not-modified" };
  }
  if (!response.ok) {
    throw new FeedHttpError(response.status, url);
  }
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) {
    throw new Error(`Feed too large (${length} bytes): ${url}`);
  }
  const body = await response.text();
  if (body.length > MAX_BYTES) {
    throw new Error(`Feed too large: ${url}`);
  }
  return {
    status: "ok",
    body,
    validators: {
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
    },
  };
}

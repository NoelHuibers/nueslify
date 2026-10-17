import type { MusicRange, TrackRef } from "#/lib/domain.ts";
import { type GenreId, type MusicProviderId, musicProvider } from "#/lib/music.ts";

export type TrackRequest = {
  userId: string;
  range: MusicRange;
  genres: readonly GenreId[];
  limit: number;
};

/**
 * Server half of a music provider plugin: where the listener's songs come from.
 * The client half (how they play) lives in `src/features/player/backends`.
 */
export type MusicSourceAdapter = {
  id: MusicProviderId;
  /** The server has the credentials this provider needs (API keys, client ids, …). */
  isConfigured: () => boolean;
  /** The listener connected their account. Always true for account-free catalogues. */
  isConnected: (userId: string) => Promise<boolean>;
  fetchTracks: (request: TrackRequest) => Promise<TrackRef[]>;
  /** Marked experimental in the UI until verified against the live service. */
  experimental?: boolean;
};

export type MusicErrorCode =
  | "not_connected"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "quota_exceeded"
  | "unavailable";

export class MusicProviderError extends Error {
  readonly provider: MusicProviderId;
  readonly code: MusicErrorCode;
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    options: {
      provider: MusicProviderId;
      code: MusicErrorCode;
      status: number;
      retryAfterSeconds?: number | null;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "MusicProviderError";
    this.provider = options.provider;
    this.code = options.code;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
  }
}

/** Maps an HTTP error response from any provider API onto a MusicProviderError. */
export async function errorFromResponse(
  provider: MusicProviderId,
  response: Response,
): Promise<MusicProviderError> {
  const body: unknown = await response.json().catch(() => null);
  const text = JSON.stringify(body ?? "");
  const retryAfter = Number(response.headers.get("retry-after"));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null;
  const message = `${musicProvider(provider).label} responded ${response.status}`;
  const base = { provider, status: response.status, retryAfterSeconds };

  if (response.status === 401) {
    return new MusicProviderError(message, { ...base, code: "unauthorized" });
  }
  if (response.status === 403) {
    // Google signals exhausted quota with 403 + "quotaExceeded".
    const code = text.includes("quotaExceeded") ? "quota_exceeded" : "forbidden";
    return new MusicProviderError(message, { ...base, code });
  }
  if (response.status === 429) {
    const code = text.includes("QUOTA_EXCEEDED") ? "quota_exceeded" : "rate_limited";
    return new MusicProviderError(message, { ...base, code });
  }
  return new MusicProviderError(message, { ...base, code: "unavailable" });
}

/** Human-readable notice for the player when a music source can't be used right now. */
export function describeMusicError(error: MusicProviderError): string {
  const name = musicProvider(error.provider).label;
  switch (error.code) {
    case "not_connected":
      return `Connect ${name} in Settings to hear your music.`;
    case "unauthorized":
      return `Your ${name} connection expired. Reconnect it in Settings to hear music again.`;
    case "forbidden":
      return `${name} refused access. If the app is in a developer or test mode, your account may need to be allow-listed.`;
    case "quota_exceeded":
      return `Nueslify has hit its ${name} quota for now, so this part of the show is news only.`;
    case "rate_limited":
      return `${name} is rate limiting requests. Music will be back shortly.`;
    default:
      return `${name} is unavailable right now, so this part of the show is news only.`;
  }
}

const ISO_DURATION = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;

/** Parses ISO 8601 durations such as `PT3M12S` (YouTube, TIDAL) into milliseconds. */
export function isoDurationToMs(value: string | null | undefined): number | null {
  const match = value ? ISO_DURATION.exec(value) : null;
  if (!match) {
    return null;
  }
  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  return Math.round(
    ((Number(days) * 24 + Number(hours)) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000,
  );
}

export const HTTP_TIMEOUT_MS = 10_000;

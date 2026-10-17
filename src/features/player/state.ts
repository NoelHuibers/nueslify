import type { Segment, ShowBlock } from "#/lib/domain.ts";
import type { MusicProviderId } from "#/lib/music.ts";

export type PlayerStatus = "idle" | "starting" | "playing" | "paused" | "buffering" | "error";

export type PlayerState = {
  status: PlayerStatus;
  queue: Segment[];
  /** Index into `queue` of the current segment, -1 before the show starts. */
  current: number;
  nextBlockIndex: number;
  loadingBlock: boolean;
  notices: string[];
  error: string | null;
  /** Host/news audio progress in seconds. Music progress lives inside Spotify's player. */
  position: number;
  duration: number;
  /** A provider's player was asked to play but nothing happened (autoplay blocked). */
  musicNeedsGesture: boolean;
  /** Provider whose player is on the dock's stage (Spotify, YouTube), if any. */
  stageProvider: MusicProviderId | null;
};

export const initialPlayerState: PlayerState = {
  status: "idle",
  queue: [],
  current: -1,
  nextBlockIndex: 0,
  loadingBlock: false,
  notices: [],
  error: null,
  position: 0,
  duration: 0,
  musicNeedsGesture: false,
  stageProvider: null,
};

/** Start prefetching the next block when this few segments remain after the current one. */
export const PREFETCH_THRESHOLD = 2;
const MAX_NOTICES = 3;
const MAX_RECENT_TRACKS = 100;

export function currentSegment(state: PlayerState): Segment | null {
  return state.queue[state.current] ?? null;
}

export function upcomingSegments(state: PlayerState): Segment[] {
  return state.queue.slice(state.current + 1);
}

export function appendBlock(state: PlayerState, block: ShowBlock): PlayerState {
  const notices = [...state.notices, ...block.notices.filter((n) => !state.notices.includes(n))];
  return {
    ...state,
    queue: [...state.queue, ...block.segments],
    nextBlockIndex: Math.max(state.nextBlockIndex, block.index + 1),
    loadingBlock: false,
    error: null,
    notices: notices.slice(-MAX_NOTICES),
  };
}

export function advance(state: PlayerState): PlayerState {
  return {
    ...state,
    current: Math.min(state.current + 1, state.queue.length),
    position: 0,
    duration: 0,
    musicNeedsGesture: false,
  };
}

export function shouldPrefetch(state: PlayerState): boolean {
  if (state.loadingBlock || state.status === "idle" || state.status === "error") {
    return false;
  }
  return state.queue.length - (state.current + 1) <= PREFETCH_THRESHOLD;
}

/** Ids of the songs already played or queued in this session, newest last. */
export function recentTrackIds(state: PlayerState): string[] {
  return state.queue
    .filter((segment) => segment.kind === "music")
    .map((segment) => segment.track.id)
    .slice(-MAX_RECENT_TRACKS);
}

export type PreviousItem =
  | { kind: "nothing" }
  | { kind: "track"; name: string; artists: string[] }
  | { kind: "story"; title: string; topline: string | null };

/** What the host should bridge *from* when the next block starts. */
export function previousItem(state: PlayerState): PreviousItem {
  const last = state.queue.at(-1);
  if (!last || last.kind === "host") {
    return { kind: "nothing" };
  }
  if (last.kind === "music") {
    return { kind: "track", name: last.track.name, artists: last.track.artists };
  }
  return { kind: "story", title: last.story.title, topline: last.story.topline };
}

export function dismissNotice(state: PlayerState, notice: string): PlayerState {
  return { ...state, notices: state.notices.filter((n) => n !== notice) };
}

export type EmbedProgress = {
  isPaused: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
};

/**
 * The embed has no "ended" event, so infer it. Observed behaviour (Oct 2026): at the end of a
 * track Spotify keeps reporting `position === duration` with `isPaused: false`. Older players
 * paused or jumped back to 0 instead, so those cases count as an end too.
 */
export function detectTrackEnd(
  previous: EmbedProgress | null,
  next: EmbedProgress,
  toleranceMs = 1500,
): boolean {
  if (next.duration > 0 && next.position >= next.duration - 50) {
    return true;
  }
  if (!previous || previous.duration <= 0) {
    return false;
  }
  const wasNearEnd = previous.position >= previous.duration - toleranceMs;
  const pausedAtEnd = wasNearEnd && next.isPaused && !next.isBuffering;
  const wrappedToStart = wasNearEnd && next.position < previous.position - toleranceMs;
  return pausedAtEnd || wrappedToStart;
}

export function embedStatus(
  update: Pick<EmbedProgress, "isPaused" | "isBuffering">,
): "playing" | "paused" | "buffering" {
  if (update.isBuffering) {
    return "buffering";
  }
  return update.isPaused ? "paused" : "playing";
}

export function addNotice(state: PlayerState, notice: string): PlayerState {
  return {
    ...state,
    notices: [...state.notices.filter((n) => n !== notice), notice].slice(-MAX_NOTICES),
  };
}

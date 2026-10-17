import type { Segment } from "#/lib/domain.ts";

const ARTWORK = [{ src: "/icon-512x512.png", sizes: "512x512", type: "image/png" }];

function mediaTitle(segment: Segment): string {
  switch (segment.kind) {
    case "news":
      return segment.story.title;
    case "music":
      // Track metadata stays inside Spotify's player.
      return "Music on Spotify";
    default:
      return "Your host";
  }
}

function hasMediaSession(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

/** Lock-screen / headset integration via the Media Session API. */
export function updateMediaSession(
  segment: Segment,
  actions: { toggle: () => void; next: () => void },
): void {
  if (!hasMediaSession()) {
    return;
  }
  const session = navigator.mediaSession;
  session.metadata = new MediaMetadata({
    title: mediaTitle(segment),
    artist: "Nueslify",
    album: segment.kind === "news" ? (segment.story.topline ?? "News") : "Your personal radio",
    artwork: ARTWORK,
  });
  session.setActionHandler("play", actions.toggle);
  session.setActionHandler("pause", actions.toggle);
  session.setActionHandler("nexttrack", actions.next);
}

export function clearMediaSession(): void {
  if (hasMediaSession()) {
    navigator.mediaSession.metadata = null;
  }
}

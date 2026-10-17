import type { Segment } from "#/lib/domain.ts";

export function segmentTitle(segment: Segment): string {
  switch (segment.kind) {
    case "music":
      return segment.track.name;
    case "news":
      return segment.story.title;
    default:
      return segment.role === "intro" ? "Show opening" : "Your host";
  }
}

export function segmentSubtitle(segment: Segment): string {
  switch (segment.kind) {
    case "music":
      return segment.track.artists.join(", ");
    case "news":
      return segment.story.topline ?? "News";
    default:
      return "Nueslify";
  }
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

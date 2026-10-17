import { MicVocalIcon, MusicIcon, NewspaperIcon } from "lucide-react";
import type { Segment } from "#/lib/domain.ts";
import { cn } from "#/lib/utils.ts";

const SEGMENT_ICONS = { music: MusicIcon, news: NewspaperIcon, host: MicVocalIcon } as const;

/** Animated bars shown while the host is on air. Purely decorative. */
export function Equalizer({ active, className }: { active: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex h-4 items-end gap-0.5", className)}>
      {[0, 150, 300, 450].map((delay) => (
        <span
          className={cn(
            "block h-full w-1 origin-bottom rounded-full bg-highlight",
            active ? "animate-equalizer" : "scale-y-30",
          )}
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export function SegmentIcon({ segment, className }: { segment: Segment; className?: string }) {
  const Icon = SEGMENT_ICONS[segment.kind];
  return <Icon aria-hidden="true" className={cn("size-4 shrink-0", className)} />;
}

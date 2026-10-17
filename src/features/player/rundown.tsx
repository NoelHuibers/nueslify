import { shallow } from "@tanstack/react-store";
import { ProviderAttribution } from "#/components/music-brand.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import type { Segment } from "#/lib/domain.ts";
import { cn } from "#/lib/utils.ts";
import { usePlayerState } from "./player-context.ts";
import { segmentSubtitle, segmentTitle } from "./segment-text.ts";
import { SegmentIcon } from "./widgets.tsx";

const VISIBLE_UPCOMING = 8;

/** The show's running order: what's on now and what's coming up. */
export function Rundown() {
  const { queue, current, loadingBlock } = usePlayerState(
    (s) => ({ queue: s.queue, current: s.current, loadingBlock: s.loadingBlock }),
    { compare: shallow },
  );
  const upcoming = queue.slice(Math.max(current, 0), Math.max(current, 0) + VISIBLE_UPCOMING + 1);
  const played = Math.max(current, 0);

  return (
    <Card className="glass h-fit lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle className="text-base">Rundown</CardTitle>
        {played > 0 ? (
          <p className="text-muted-foreground text-xs">
            {played} segment{played === 1 ? "" : "s"} played
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-1">
          {upcoming.map((segment, offset) => (
            <RundownItem
              isCurrent={offset === 0 && current >= 0}
              key={segment.id}
              segment={segment}
            />
          ))}
          {loadingBlock ? (
            <li className="flex items-center gap-2 px-2 py-2 text-muted-foreground text-sm">
              <Spinner /> Preparing what's next…
            </li>
          ) : null}
        </ol>
      </CardContent>
    </Card>
  );
}

function RundownItem({ segment, isCurrent }: { segment: Segment; isCurrent: boolean }) {
  return (
    <li
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2",
        isCurrent ? "bg-accent text-accent-foreground" : "text-muted-foreground",
      )}
    >
      <SegmentIcon className={cn(isCurrent && "text-highlight")} segment={segment} />
      <div className="min-w-0 flex-1">
        {segment.kind === "music" ? (
          // Track metadata always links back to the provider.
          <a
            className="block truncate font-medium text-foreground text-sm hover:underline"
            href={segment.track.url}
            rel="noopener"
            target="_blank"
          >
            {segment.track.name}
          </a>
        ) : (
          <p className="truncate font-medium text-foreground text-sm">{segmentTitle(segment)}</p>
        )}
        <p className="truncate text-xs">{segmentSubtitle(segment)}</p>
      </div>
      {segment.kind === "music" ? (
        <ProviderAttribution provider={segment.track.provider} size="sm" />
      ) : null}
    </li>
  );
}

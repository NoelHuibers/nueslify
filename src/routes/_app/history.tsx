import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLinkIcon, HistoryIcon, PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Badge } from "#/components/ui/badge.tsx";
import { Button, buttonVariants } from "#/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty.tsx";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemTitle,
} from "#/components/ui/item.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs.tsx";
import { SaveStoryButton } from "#/features/player/now-playing.tsx";
import { CATEGORIES, regionName } from "#/lib/domain.ts";
import { newsSourceInfo } from "#/lib/news/sources.ts";
import { historyQuery } from "#/lib/queries.ts";
import type { HistoryItem } from "#/server/functions/history.ts";

export const Route = createFileRoute("/_app/history")({
  head: () => ({ meta: [{ title: "History · Nueslify" }] }),
  validateSearch: z.object({ saved: z.boolean().optional().catch(undefined) }),
  loaderDeps: ({ search }) => ({ saved: search.saved ?? false }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureInfiniteQueryData(historyQuery(deps.saved)),
  component: HistoryPage,
});

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function timeAgo(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) {
    return relative.format(minutes, "minute");
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 48) {
    return relative.format(hours, "hour");
  }
  return relative.format(Math.round(hours / 24), "day");
}

function HistoryPage() {
  const { saved = false } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    historyQuery(saved),
  );
  const items = data.pages.flatMap((page) => page.items);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const togglePlay = (item: HistoryItem) => {
    if (!item.audioUrl) {
      return;
    }
    audioRef.current ??= new Audio();
    const audio = audioRef.current;
    if (playing === item.storyId) {
      audio.pause();
      setPlaying(null);
      return;
    }
    audio.src = item.audioUrl;
    audio.onended = () => setPlaying(null);
    void audio.play().then(
      () => setPlaying(item.storyId),
      () => setPlaying(null),
    );
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-3xl tracking-tight">History</h1>
          <p className="text-muted-foreground">Stories from your shows, newest first.</p>
        </div>
        <Tabs
          onValueChange={(value: unknown) =>
            void navigate({ search: value === "saved" ? { saved: true } : {} })
          }
          value={saved ? "saved" : "all"}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {items.length === 0 ? (
        <Empty className="glass rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HistoryIcon />
            </EmptyMedia>
            <EmptyTitle>{saved ? "No saved stories yet" : "Nothing heard yet"}</EmptyTitle>
            <EmptyDescription>
              {saved
                ? "Tap “Save story” while a story plays to keep it here."
                : "Start the show and stories will appear here."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link className={buttonVariants()} to="/listen">
              Go to the show
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ItemGroup className="gap-3">
          {items.map((item) => (
            <HistoryEntry
              isPlaying={playing === item.storyId}
              item={item}
              key={item.storyId}
              onTogglePlay={() => togglePlay(item)}
            />
          ))}
        </ItemGroup>
      )}

      {hasNextPage ? (
        <Button
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          variant="secondary"
        >
          {isFetchingNextPage ? <Spinner /> : null} Load more
        </Button>
      ) : null}
    </div>
  );
}

function HistoryEntry({
  item,
  isPlaying,
  onTogglePlay,
}: {
  item: HistoryItem;
  isPlaying: boolean;
  onTogglePlay: () => void;
}) {
  const category = CATEGORIES.find((c) => c.id === item.ressort)?.label;
  const region = regionName(item.regionId);
  const source = newsSourceInfo(item.sourceId);
  return (
    <Item className="glass flex-wrap" role="listitem" variant="outline">
      <ItemContent className="min-w-0">
        <ItemTitle className="line-clamp-2">{item.title}</ItemTitle>
        <ItemDescription>
          {[item.topline, source?.name, `heard ${timeAgo(item.heardAt)}`]
            .filter(Boolean)
            .join(" · ")}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {item.audioUrl ? (
          <Button
            aria-label={isPlaying ? "Pause summary" : "Replay summary"}
            onClick={onTogglePlay}
            size="icon"
            variant="ghost"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </Button>
        ) : null}
        <a
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label={`Read on ${source?.domain ?? item.sourceId}`}
          href={item.shareUrl}
          rel="noopener"
          target="_blank"
        >
          <ExternalLinkIcon />
        </a>
      </ItemActions>
      <ItemFooter className="flex-wrap justify-start gap-2">
        {category ? <Badge variant="outline">{category}</Badge> : null}
        {region ? <Badge variant="outline">{region}</Badge> : null}
        <SaveStoryButton initiallySaved={item.saved} storyId={item.storyId} />
        {item.transcript ? (
          <details className="w-full text-muted-foreground text-sm">
            <summary className="cursor-pointer select-none">Transcript</summary>
            <p className="mt-2 whitespace-pre-line">{item.transcript}</p>
          </details>
        ) : null}
      </ItemFooter>
    </Item>
  );
}

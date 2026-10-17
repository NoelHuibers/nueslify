import { useMutation, useQueryClient } from "@tanstack/react-query";
import { shallow } from "@tanstack/react-store";
import {
  BookmarkCheckIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  MousePointerClickIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProviderAttribution } from "#/components/music-brand.tsx";
import { Alert, AlertDescription } from "#/components/ui/alert.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button, buttonVariants } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { CATEGORIES, type MusicSegment, type NewsSegment, regionName } from "#/lib/domain.ts";
import { musicProvider } from "#/lib/music.ts";
import { newsSourceInfo, newsSourceName } from "#/lib/news/sources.ts";
import { setStorySaved } from "#/server/functions/history.ts";
import { usePlayerState } from "./player-context.ts";
import { segmentTitle } from "./segment-text.ts";
import { currentSegment } from "./state.ts";
import { Equalizer } from "./widgets.tsx";

export function NowPlaying() {
  const { segment, playing, needsGesture } = usePlayerState(
    (s) => ({
      segment: currentSegment(s),
      playing: s.status === "playing",
      needsGesture: s.musicNeedsGesture,
    }),
    { compare: shallow },
  );

  if (!segment) {
    return (
      <Card aria-busy="true" className="glass">
        <CardHeader>
          <CardDescription>Your host is preparing the show…</CardDescription>
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (segment.kind === "music") {
    return <MusicCard needsGesture={needsGesture} segment={segment} />;
  }

  return (
    <Card aria-live="polite" className="glass">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Equalizer active={playing} />
          <span>{segment.kind === "news" ? "News" : segmentTitle(segment)}</span>
          {segment.kind === "news" ? <StoryBadges segment={segment} /> : null}
        </div>
        <CardTitle className="text-balance text-2xl md:text-3xl">
          <h2>{segment.kind === "news" ? segment.story.title : "On air"}</h2>
        </CardTitle>
        {segment.kind === "news" ? <StoryByline segment={segment} /> : null}
      </CardHeader>
      <CardContent>
        <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed">
          {segment.transcript}
        </p>
      </CardContent>
      {segment.kind === "news" ? (
        <CardFooter className="flex-wrap gap-2">
          <SaveStoryButton storyId={segment.story.id} />
          <a
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href={segment.story.shareUrl}
            rel="noopener"
            target="_blank"
          >
            <ExternalLinkIcon /> Read on{" "}
            {newsSourceInfo(segment.story.sourceId)?.domain ?? segment.story.sourceId}
          </a>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function StoryByline({ segment }: { segment: NewsSegment }) {
  const { topline, sourceId, alsoReportedBy } = segment.story;
  const also = alsoReportedBy.map(newsSourceName);
  return (
    <CardDescription>
      {[topline, newsSourceName(sourceId)].filter(Boolean).join(" · ")}
      {also.length > 0 ? <span className="block">Also reported by {also.join(", ")}</span> : null}
    </CardDescription>
  );
}

function StoryBadges({ segment }: { segment: NewsSegment }) {
  const category = CATEGORIES.find((c) => c.id === segment.story.ressort)?.label;
  const region = regionName(segment.story.regionId);
  return (
    <span className="ml-auto flex gap-1">
      {category ? <Badge variant="outline">{category}</Badge> : null}
      {region ? <Badge variant="outline">{region}</Badge> : null}
    </span>
  );
}

/**
 * The song itself plays in the provider's own player (or our audio element for open catalogues).
 * We only show provider metadata, linked back to the provider, with the attribution it requires.
 */
function MusicCard({ segment, needsGesture }: { segment: MusicSegment; needsGesture: boolean }) {
  const { track } = segment;
  const provider = musicProvider(track.provider);
  return (
    <Card className="glass">
      <CardHeader>
        <CardDescription>Now playing</CardDescription>
        <CardTitle className="text-balance text-2xl md:text-3xl">
          <h2>
            <a className="hover:underline" href={track.url} rel="noopener" target="_blank">
              {track.name}
            </a>
          </h2>
        </CardTitle>
        <CardDescription className="text-base">{track.artists.join(", ")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {needsGesture ? (
          <Alert>
            <MousePointerClickIcon />
            <AlertDescription>
              Your browser blocked autoplay. Press play in the {provider.label} player below to
              continue.
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <ProviderAttribution provider={track.provider} />
          <a
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href={track.url}
            rel="noopener"
            target="_blank"
          >
            Listen on {provider.label}
          </a>
        </div>
        {track.credit ? (
          <p className="text-muted-foreground text-xs">
            Music by {track.artists.join(", ")} ·{" "}
            <a
              className="underline underline-offset-4"
              href={track.credit.url}
              rel="noopener"
              target="_blank"
            >
              {track.credit.label}
            </a>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SaveStoryButton({
  storyId,
  initiallySaved = false,
}: {
  storyId: string;
  initiallySaved?: boolean;
}) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(initiallySaved);
  const mutation = useMutation({
    mutationFn: (next: boolean) => setStorySaved({ data: { storyId, saved: next } }),
    onMutate: (next) => setSaved(next),
    onError: (_error, next) => {
      setSaved(!next);
      toast.error("Couldn't update your saved stories.");
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["history"] });
      if (result.saved) {
        toast.success("Saved — find it under History.");
      }
    },
  });
  return (
    <Button
      aria-pressed={saved}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(!saved)}
      size="sm"
      variant={saved ? "secondary" : "outline"}
    >
      {saved ? <BookmarkCheckIcon /> : <BookmarkIcon />}
      {saved ? "Saved" : "Save story"}
    </Button>
  );
}

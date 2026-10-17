import { useHotkey } from "@tanstack/react-hotkeys";
import { shallow } from "@tanstack/react-store";
import { PauseIcon, PlayIcon, SkipForwardIcon } from "lucide-react";
import { useCallback } from "react";
import { Button } from "#/components/ui/button.tsx";
import { Progress } from "#/components/ui/progress.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip.tsx";
import { musicProvider } from "#/lib/music.ts";
import { cn } from "#/lib/utils.ts";
import { playsInAudioElement } from "./engine.ts";
import { usePlayer, usePlayerState } from "./player-context.ts";
import { formatTime, segmentSubtitle, segmentTitle } from "./segment-text.ts";
import { currentSegment } from "./state.ts";
import { Equalizer, SegmentIcon } from "./widgets.tsx";

/**
 * Persistent bottom dock. Hosts the stage for providers whose player must stay on screen
 * (Spotify's embed, YouTube's player) and the show transport. Visible on every app page once
 * the show has started, so music keeps playing while you browse.
 */
export function PlayerDock() {
  const engine = usePlayer();
  const { status, stageProvider } = usePlayerState(
    (s) => ({ status: s.status, stageProvider: s.stageProvider }),
    { compare: shallow },
  );
  const active = status !== "idle";
  // Must be referentially stable: a new callback would tear down the players on every render.
  const stageRef = useCallback(
    (element: HTMLDivElement | null) => {
      engine.attachStage(element);
      return () => engine.attachStage(null);
    },
    [engine],
  );

  useHotkey("Space", () => engine.toggle(), { preventDefault: true, ignoreInputs: true });
  useHotkey("ArrowRight", () => engine.next(), { enabled: active, ignoreInputs: true });
  useHotkey("N", () => engine.next(), { enabled: active, ignoreInputs: true });
  useHotkey("R", () => engine.replay(), { enabled: active, ignoreInputs: true });

  return (
    <section
      aria-label="Player"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-transform duration-300",
        active ? "translate-y-0" : "pointer-events-none invisible translate-y-full",
      )}
      inert={!active}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-8">
        <section
          aria-label="Music player"
          className={cn(
            "w-full overflow-hidden rounded-xl md:order-last md:w-[420px] md:shrink-0",
            stageProvider === null && "hidden",
            // YouTube requires at least 200×200 px; Spotify's compact embed is 152 px tall.
            stageProvider === "youtube" ? "aspect-video min-h-[200px] md:w-[356px]" : "h-[152px]",
          )}
          ref={stageRef}
        />
        <Transport />
      </div>
    </section>
  );
}

function Transport() {
  const engine = usePlayer();
  const { segment, status, position, duration } = usePlayerState(
    (s) => ({
      segment: currentSegment(s),
      status: s.status,
      position: s.position,
      duration: s.duration,
    }),
    { compare: shallow },
  );
  const playing = status === "playing";
  const busy = status === "starting" || status === "buffering";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={playing ? "Pause" : "Play"}
              className="size-12 shrink-0 rounded-full"
              onClick={() => engine.toggle()}
              size="icon"
            />
          }
        >
          <TransportIcon busy={busy} playing={playing} />
        </TooltipTrigger>
        <TooltipContent>Play / pause (Space)</TooltipContent>
      </Tooltip>

      <div className="min-w-0 flex-1">
        {segment ? (
          <>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <SegmentIcon segment={segment} />
              <span className="truncate">{segmentSubtitle(segment)}</span>
              {segment.kind === "music" ? null : <Equalizer active={playing} className="ml-auto" />}
            </div>
            <p className="truncate font-medium text-sm">{segmentTitle(segment)}</p>
            {segment.kind === "music" && !playsInAudioElement(segment) ? (
              <p className="text-muted-foreground text-xs">
                Playing on {musicProvider(segment.track.provider).label}
              </p>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <Progress
                  aria-label="Segment progress"
                  className="min-w-0 flex-1"
                  value={duration > 0 ? (position / duration) * 100 : 0}
                />
                <span className="w-16 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
                  {formatTime(position)} / {formatTime(duration)}
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Your host is preparing the show…</p>
        )}
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="Skip to next segment"
              disabled={!segment}
              onClick={() => engine.next()}
              size="icon"
              variant="ghost"
            />
          }
        >
          <SkipForwardIcon />
        </TooltipTrigger>
        <TooltipContent>Next segment (N)</TooltipContent>
      </Tooltip>
    </div>
  );
}

function TransportIcon({ busy, playing }: { busy: boolean; playing: boolean }) {
  if (busy) {
    return <Spinner />;
  }
  return playing ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />;
}

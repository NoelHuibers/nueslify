import { Link } from "@tanstack/react-router";
import { shallow } from "@tanstack/react-store";
import {
  AlertTriangleIcon,
  InfoIcon,
  KeyboardIcon,
  MusicIcon,
  PlayIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button, buttonVariants } from "#/components/ui/button.tsx";
import { Card, CardContent } from "#/components/ui/card.tsx";
import { Kbd } from "#/components/ui/kbd.tsx";
import { CATEGORIES, HOST_STYLES, LANGUAGES, type Preferences, regionName } from "#/lib/domain.ts";
import { chooseSource, musicProvider } from "#/lib/music.ts";
import type { MusicSourceView } from "#/server/functions/music.ts";
import { partOfDayGreeting } from "./greeting.ts";
import { NowPlaying } from "./now-playing.tsx";
import { usePlayer, usePlayerState } from "./player-context.ts";
import { Rundown } from "./rundown.tsx";

export function ListenStage({
  name,
  prefs,
  sources,
}: {
  name: string;
  prefs: Preferences;
  sources: MusicSourceView[];
}) {
  const engine = usePlayer();
  const { status, error, notices } = usePlayerState(
    (s) => ({ status: s.status, error: s.error, notices: s.notices }),
    { compare: shallow },
  );

  if (status === "idle") {
    return (
      <IdleHero name={name} onStart={() => void engine.start()} prefs={prefs} sources={sources} />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        {status === "error" && error ? (
          <Alert variant="destructive">
            <AlertTriangleIcon />
            <AlertTitle>The show hit a snag</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <span>{error}</span>
              <Button onClick={() => engine.retry()} size="sm" variant="outline">
                <RotateCcwIcon /> Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        {notices.map((notice) => (
          <Alert key={notice}>
            <InfoIcon />
            <AlertDescription className="flex items-start justify-between gap-2">
              <span>{notice}</span>
              <Button
                aria-label="Dismiss"
                className="-my-1 shrink-0"
                onClick={() => engine.dismissNotice(notice)}
                size="icon-sm"
                variant="ghost"
              >
                <XIcon />
              </Button>
            </AlertDescription>
          </Alert>
        ))}
        <NowPlaying />
      </div>
      <Rundown />
    </div>
  );
}

function IdleHero({
  name,
  prefs,
  sources,
  onStart,
}: {
  name: string;
  prefs: Preferences;
  sources: MusicSourceView[];
  onStart: () => void;
}) {
  const region = regionName(prefs.regionId);
  const style = HOST_STYLES.find((s) => s.id === prefs.hostStyle)?.label;
  const language = LANGUAGES.find((l) => l.id === prefs.language)?.label;
  const categories = CATEGORIES.filter((c) => prefs.categories.includes(c.id)).map((c) => c.label);
  const music = prefs.balance > 0 ? chooseSource(sources, prefs.musicSource) : null;
  const canConnectAccount = sources.some(
    (source) =>
      source.configured && !source.connected && musicProvider(source.id).kind === "account",
  );

  return (
    <section className="flex flex-col items-center gap-8 py-10 text-center md:py-16">
      <div className="flex flex-col gap-2">
        {/* Server and browser may sit in different time zones. */}
        <p className="text-muted-foreground" suppressHydrationWarning={true}>
          {partOfDayGreeting(new Date())},
        </p>
        <h1 className="font-semibold text-4xl tracking-tight md:text-5xl">{name}</h1>
      </div>

      <button
        aria-label="Start the show"
        className="group relative grid size-40 place-items-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/20 outline-none transition hover:scale-105 hover:bg-highlight hover:text-highlight-foreground focus-visible:ring-4 focus-visible:ring-ring/60 md:size-48"
        onClick={onStart}
        type="button"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:2.5s] group-hover:bg-highlight/20"
        />
        <PlayIcon className="size-16 translate-x-1 fill-current md:size-20" />
      </button>
      <p className="text-muted-foreground text-sm">
        Press start or <Kbd>Space</Kbd> to go on air
      </p>

      <Card className="glass w-full max-w-xl">
        <CardContent className="flex flex-wrap justify-center gap-2">
          {style ? <Badge variant="secondary">{style} host</Badge> : null}
          {language ? <Badge variant="secondary">{language}</Badge> : null}
          {region ? <Badge variant="secondary">{region}</Badge> : null}
          <Badge variant="secondary">
            {music ? `Music: ${musicProvider(music).label}` : "News only"}
          </Badge>
          {categories.map((category) => (
            <Badge key={category} variant="outline">
              {category}
            </Badge>
          ))}
          <Link
            className={buttonVariants({ variant: "link", className: "h-auto px-2 py-0.5 text-xs" })}
            to="/settings"
          >
            Tune your station
          </Link>
        </CardContent>
      </Card>

      {music && musicProvider(music).kind === "catalog" && canConnectAccount ? (
        <Alert className="max-w-xl text-left">
          <MusicIcon />
          <AlertTitle>Want your own favourites?</AlertTitle>
          <AlertDescription>
            <span>
              You're hearing free music from {musicProvider(music).label}. Connect the service you
              use in{" "}
              <Link className="underline underline-offset-4" to="/settings">
                Settings
              </Link>{" "}
              and your own songs join the show.
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      <p className="flex items-center gap-2 text-muted-foreground text-xs">
        <KeyboardIcon aria-hidden="true" className="size-4" />
        <Kbd>Space</Kbd> play/pause · <Kbd>N</Kbd> next · <Kbd>R</Kbd> replay host
      </p>
    </section>
  );
}

import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { MicVocalIcon, NewspaperIcon, SparklesIcon } from "lucide-react";
import { AppIcon, Wordmark } from "#/components/brand.tsx";
import { SiteFooter } from "#/components/site-footer.tsx";
import { SpotifyLogo } from "#/components/spotify-brand.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { buttonVariants } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import { NEWS_SOURCES } from "#/lib/news/sources.ts";
import { publicConfigQuery, viewerQuery } from "#/lib/queries.ts";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const viewer = await context.queryClient.fetchQuery(viewerQuery);
    if (viewer) {
      throw redirect({ to: "/listen" });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(publicConfigQuery),
  component: Landing,
});

const FEATURES = [
  {
    icon: MicVocalIcon,
    title: "A host who knows you",
    description:
      "An AI moderator greets you by name, matches your vibe — friendly, professional or laid-back — and talks in English or German.",
  },
  {
    icon: NewspaperIcon,
    title: "Real news, summarised",
    description: `Pick from ${NEWS_SOURCES.length} German and international outlets, from tagesschau to the BBC, each labelled with who owns it and where it leans. Stories covered everywhere come first, and you hear each one once.`,
  },
  {
    icon: SparklesIcon,
    title: "Your music in between",
    description:
      "Spotify, Apple Music, TIDAL, YouTube Music or free music from Audius and Jamendo, played between the news in each service's own player.",
  },
] as const;

function Landing() {
  const config = Route.useLoaderData();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <Link className="flex items-center gap-2" to="/">
          <AppIcon />
          <Wordmark className="text-2xl" />
        </Link>
        <Link className={buttonVariants({ variant: "ghost" })} to="/sign-in">
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 md:px-8">
        <section className="flex flex-col items-center gap-6 py-16 text-center md:py-24">
          {config.demoMode ? (
            <Badge className="border-highlight/40 text-highlight" variant="outline">
              Demo mode — AI voices are simulated
            </Badge>
          ) : null}
          <h1 className="sr-only">Nueslify</h1>
          <Wordmark className="text-7xl md:text-9xl" />
          <p className="max-w-xl text-balance text-lg text-muted-foreground md:text-xl">
            Your personal radio station. An AI host, the news that matters to you, and your
            favourite songs in between.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              className={buttonVariants({
                size: "lg",
                className: "h-12 rounded-xl px-8 text-base",
              })}
              to="/sign-up"
            >
              Start listening
            </Link>
            <Link
              className={buttonVariants({
                size: "lg",
                variant: "secondary",
                className: "h-12 rounded-xl px-8 text-base",
              })}
              to="/sign-in"
            >
              I have an account
            </Link>
          </div>
        </section>

        <section aria-label="Features" className="grid w-full gap-4 pb-16 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card className="glass" key={feature.title}>
              <CardHeader>
                <feature.icon aria-hidden="true" className="mb-2 size-6 text-highlight" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        {config.spotifyEnabled ? (
          <section className="flex flex-col items-center gap-3 pb-20 text-center text-muted-foreground text-sm">
            <span>Music playback powered by</span>
            <SpotifyLogo width={110} />
            <CardContent className="max-w-md p-0 text-xs">
              Spotify Premium plays full tracks, everyone else hears previews. Nueslify is not
              affiliated with Spotify.
            </CardContent>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

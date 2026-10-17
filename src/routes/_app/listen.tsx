import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ListenStage } from "#/features/player/listen-stage.tsx";
import { musicSourcesQuery, preferencesQuery } from "#/lib/queries.ts";

export const Route = createFileRoute("/_app/listen")({
  head: () => ({ meta: [{ title: "Listen · Nueslify" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(preferencesQuery),
      context.queryClient.ensureQueryData(musicSourcesQuery),
    ]),
  component: ListenPage,
});

function ListenPage() {
  const { viewer } = Route.useRouteContext();
  const { data: prefs } = useSuspenseQuery(preferencesQuery);
  const { data: sources } = useSuspenseQuery(musicSourcesQuery);
  return <ListenStage name={prefs.displayName || viewer.name} prefs={prefs} sources={sources} />;
}

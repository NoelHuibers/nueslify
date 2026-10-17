import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MusicSources } from "#/features/preferences/music-sources.tsx";
import { PreferencesForm } from "#/features/preferences/preferences-form.tsx";
import { musicSourcesQuery, preferencesQuery } from "#/lib/queries.ts";
import { updatePreferences } from "#/server/functions/preferences.ts";

export const Route = createFileRoute("/_app/welcome")({
  head: () => ({ meta: [{ title: "Welcome · Nueslify" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(preferencesQuery),
      context.queryClient.ensureQueryData(musicSourcesQuery),
    ]),
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: prefs } = useSuspenseQuery(preferencesQuery);
  const { data: sources } = useSuspenseQuery(musicSourcesQuery);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-semibold text-3xl tracking-tight">Let's tune your station</h1>
        <p className="text-muted-foreground">
          A few choices and your host is ready. You can change all of this later in Settings.
        </p>
      </div>
      <MusicSources returnTo="/welcome" sources={sources} />
      <PreferencesForm
        initial={prefs}
        sources={sources}
        onSubmit={async (values) => {
          await updatePreferences({ data: values });
          await queryClient.invalidateQueries();
          await navigate({ to: "/listen" });
        }}
        submitLabel="Start listening"
      />
    </div>
  );
}

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "#/features/auth/auth-form.tsx";
import { publicConfigQuery } from "#/lib/queries.ts";

export const Route = createFileRoute("/_auth/sign-up")({
  head: () => ({ meta: [{ title: "Create account · Nueslify" }] }),
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const { data: config } = useSuspenseQuery(publicConfigQuery);
  return (
    <AuthForm
      mode="sign-up"
      oauthError={search.error}
      redirectTo={search.redirect}
      spotifyEnabled={config.spotifyEnabled}
    />
  );
}

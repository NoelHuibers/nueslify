import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppHeader } from "#/components/app-header.tsx";
import { PlayerDock } from "#/features/player/player-dock.tsx";
import { PlayerProvider } from "#/features/player/player-provider.tsx";
import { viewerQuery } from "#/lib/queries.ts";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const viewer = await context.queryClient.fetchQuery(viewerQuery);
    if (!viewer) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
    if (!viewer.onboarded && location.pathname !== "/welcome") {
      throw redirect({ to: "/welcome" });
    }
    return { viewer };
  },
  component: AppLayout,
});

function AppLayout() {
  const { viewer } = Route.useRouteContext();
  return (
    <PlayerProvider>
      <div className="flex min-h-dvh flex-col">
        <AppHeader viewer={viewer} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-64 md:px-8 md:pb-56">
          <Outlet />
        </main>
        <PlayerDock />
      </div>
    </PlayerProvider>
  );
}

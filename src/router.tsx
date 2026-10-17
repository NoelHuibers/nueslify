import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { DefaultCatchBoundary } from "#/components/default-catch-boundary.tsx";
import { NotFound } from "#/components/not-found.tsx";
import { routeTree } from "./routeTree.gen.ts";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: NotFound,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: module augmentation requires an interface
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

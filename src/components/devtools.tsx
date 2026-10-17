import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

/** Development-only devtools; lazy-loaded from the root route so they never ship to production. */
export function Devtools() {
  return (
    <TanStackDevtools
      config={{ position: "bottom-left" }}
      plugins={[
        { name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
        { name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
      ]}
    />
  );
}

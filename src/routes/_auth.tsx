import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AppIcon, Wordmark } from "#/components/brand.tsx";
import { publicConfigQuery, viewerQuery } from "#/lib/queries.ts";

const searchSchema = z.object({
  redirect: z
    .string()
    .regex(/^\/(?!\/)/, "must be a relative path")
    .optional()
    .catch(undefined),
  error: z.string().max(100).optional().catch(undefined),
});

export const Route = createFileRoute("/_auth")({
  validateSearch: searchSchema,
  beforeLoad: async ({ context, search }) => {
    const viewer = await context.queryClient.fetchQuery(viewerQuery);
    if (viewer) {
      throw redirect({ to: search.redirect ?? "/listen" });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(publicConfigQuery),
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-4">
      <Link aria-label="Nueslify home" className="flex items-center gap-3" to="/">
        <AppIcon size={44} />
        <Wordmark className="text-5xl" />
      </Link>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </main>
  );
}

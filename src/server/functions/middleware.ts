import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/server/auth.ts";

/** Resolves the current session and exposes `context.user`; redirects to sign-in otherwise. */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) {
    throw redirect({ to: "/sign-in" });
  }
  return next({
    context: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      },
    },
  });
});

import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense } from "react";
import { ServiceWorker } from "#/components/service-worker.tsx";
import { ThemeProvider, ThemeScript } from "#/components/theme.tsx";
import { Toaster } from "#/components/ui/sonner.tsx";
import { TooltipProvider } from "#/components/ui/tooltip.tsx";
import appCss from "#/styles.css?url";

const Devtools = import.meta.env.DEV
  ? lazy(() => import("#/components/devtools.tsx").then((m) => ({ default: m.Devtools })))
  : () => null;

const DESCRIPTION =
  "Nueslify is your personal AI radio host: news from the outlets you pick, your music in between.";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Nueslify — your personal AI radio" },
      { name: "description", content: DESCRIPTION },
      { name: "theme-color", content: "#1e1b4b" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:title", content: "Nueslify" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: "/icon-512x512.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://open.spotify.com" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html className="dark" lang="en" suppressHydrationWarning={true}>
      <head>
        <ThemeScript />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <TooltipProvider delay={300}>
            {children}
            <Toaster closeButton={true} position="top-center" richColors={true} />
          </TooltipProvider>
        </ThemeProvider>
        <ServiceWorker />
        <Suspense fallback={null}>
          <Devtools />
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}

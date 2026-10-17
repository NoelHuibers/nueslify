import { Link } from "@tanstack/react-router";
import { NEWS_SOURCES } from "#/lib/news/sources.ts";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-muted-foreground text-sm md:px-8">
        <span>
          News from tagesschau and{" "}
          <Link className="underline-offset-4 hover:underline" to="/about">
            {NEWS_SOURCES.length - 1} more outlets
          </Link>
          . Host voices are AI-generated.
        </span>
        <Link className="underline-offset-4 hover:underline" to="/about">
          About &amp; attribution
        </Link>
      </div>
    </footer>
  );
}

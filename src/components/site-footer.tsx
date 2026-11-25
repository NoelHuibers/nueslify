import { Link } from "@tanstack/react-router";
import { NEWS_SOURCES } from "#/lib/news/sources.ts";

const LINK = "underline-offset-4 hover:underline";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-muted-foreground text-sm md:px-8">
        <span>
          News from tagesschau and{" "}
          <Link className={LINK} to="/about">
            {NEWS_SOURCES.length - 1} more outlets
          </Link>
          . Host voices are AI-generated.
        </span>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link className={LINK} to="/about">
            About &amp; attribution
          </Link>
          <Link className={LINK} to="/impressum">
            Impressum
          </Link>
          <Link className={LINK} to="/privacy">
            Privacy policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}

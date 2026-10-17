import { cn } from "#/lib/utils.ts";

/*
 * Spotify attribution, following https://developer.spotify.com/documentation/design:
 * - official, unmodified artwork files (public/brand/spotify, downloaded from Spotify)
 * - full logo (icon + wordmark) wherever there is room, at least 70px wide; icon alone ≥ 21px
 * - green only on pure black/white; our tinted backgrounds get the monochrome logo
 */

export function SpotifyLogo({
  className,
  width = 84,
}: {
  className?: string | undefined;
  width?: number;
}) {
  const height = Math.round((width * 225.25) / 823.46);
  const safeWidth = Math.max(width, 70);
  return (
    <span className={cn("inline-flex shrink-0", className)} role="img" aria-label="Spotify">
      <img
        alt=""
        className="dark:hidden"
        height={height}
        src="/brand/spotify/full-logo-black.svg"
        width={safeWidth}
      />
      <img
        alt=""
        className="hidden dark:block"
        height={height}
        src="/brand/spotify/full-logo-white.svg"
        width={safeWidth}
      />
    </span>
  );
}

export function SpotifyIcon({
  className,
  size = 21,
}: {
  className?: string | undefined;
  size?: number;
}) {
  const safeSize = Math.max(size, 21);
  return (
    <span className={cn("inline-flex shrink-0", className)} role="img" aria-label="Spotify">
      <img
        alt=""
        className="dark:hidden"
        height={safeSize}
        src="/brand/spotify/icon-black.svg"
        width={safeSize}
      />
      <img
        alt=""
        className="hidden dark:block"
        height={safeSize}
        src="/brand/spotify/icon-white.svg"
        width={safeSize}
      />
    </span>
  );
}

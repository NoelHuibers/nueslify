import { SpotifyIcon, SpotifyLogo } from "#/components/spotify-brand.tsx";
import { type MusicProviderId, musicProvider } from "#/lib/music.ts";
import { cn } from "#/lib/utils.ts";

/**
 * Attribution for a music provider. Spotify uses its official logo files (as its design
 * guidelines require); other providers are credited by name until their official badges are
 * added (see docs/music-providers.md).
 */
export function ProviderAttribution({
  provider,
  size = "md",
  className,
}: {
  provider: MusicProviderId;
  size?: "sm" | "md";
  className?: string;
}) {
  if (provider === "spotify") {
    return size === "sm" ? (
      <SpotifyIcon className={className} />
    ) : (
      <SpotifyLogo className={className} width={90} />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 font-medium text-muted-foreground",
        size === "sm" ? "py-0 text-[10px]" : "py-0.5 text-xs",
        className,
      )}
    >
      {musicProvider(provider).label}
    </span>
  );
}

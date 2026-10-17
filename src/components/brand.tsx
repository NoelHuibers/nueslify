import { cn } from "#/lib/utils.ts";

/** The Nueslify wordmark: Pacifico in the amber → emerald brand gradient. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-brand text-brand-gradient leading-normal", className)}>Nueslify</span>
  );
}

export function AppIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={cn("rounded-lg", className)}
      decoding="async"
      height={size}
      src="/icon-192x192.png"
      width={size}
    />
  );
}

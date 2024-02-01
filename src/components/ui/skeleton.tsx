import { cn } from "~/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-900/60 dark:bg-slate-50/10",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

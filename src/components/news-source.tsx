import { Badge } from "#/components/ui/badge.tsx";
import { leaningPosition, ownershipLabel } from "#/lib/news/sources.ts";
import {
  FACTUAL_LABEL,
  LEANING_LABEL,
  LEANINGS,
  type Leaning,
  type NewsSourceInfo,
} from "#/lib/news/types.ts";
import { cn } from "#/lib/utils.ts";

/** A five-step left ↔ right scale with the outlet's rating highlighted. */
export function LeaningScale({ leaning, className }: { leaning: Leaning; className?: string }) {
  const position = leaningPosition(leaning);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-muted-foreground text-xs", className)}
    >
      <span aria-hidden="true" className="flex items-center gap-0.5 font-medium text-[10px]">
        L
        {LEANINGS.map((step, index) => (
          <span
            className={cn(
              "h-1.5 w-2.5 rounded-full bg-muted-foreground/25",
              index === position && "bg-foreground",
            )}
            key={step}
          />
        ))}
        R
      </span>
      <span>
        <span className="sr-only">Political leaning: </span>
        {LEANING_LABEL[leaning]}
      </span>
    </span>
  );
}

export function OwnershipBadge({
  source,
}: {
  source: Pick<NewsSourceInfo, "ownership" | "country" | "owner">;
}) {
  return (
    <Badge title={source.owner} variant={source.ownership === "public" ? "secondary" : "outline"}>
      {ownershipLabel(source)}
    </Badge>
  );
}

/** Every outlet with ownership, leaning and factual rating, for the About page. */
export function NewsSourceTable({ sources }: { sources: readonly NewsSourceInfo[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">News outlets, ownership and ratings</caption>
        <thead className="text-muted-foreground text-xs">
          <tr>
            <th className="py-2 pr-3 font-medium" scope="col">
              Outlet
            </th>
            <th className="py-2 pr-3 font-medium" scope="col">
              Ownership
            </th>
            <th className="py-2 pr-3 font-medium" scope="col">
              Leaning
            </th>
            <th className="py-2 font-medium" scope="col">
              Factual reporting
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr className="border-t" key={source.id}>
              <th className="py-2 pr-3 font-medium" scope="row">
                <a
                  className="underline-offset-4 hover:underline"
                  href={source.homepage}
                  rel="noopener"
                  target="_blank"
                >
                  {source.name}
                </a>
                <span className="block font-normal text-muted-foreground text-xs">
                  {source.country}
                </span>
              </th>
              <td className="py-2 pr-3">
                <OwnershipBadge source={source} />
                <span className="block text-muted-foreground text-xs">{source.owner}</span>
              </td>
              <td className="py-2 pr-3">
                <LeaningScale leaning={source.leaning} />
              </td>
              <td className="py-2">
                <a
                  className="underline-offset-4 hover:underline"
                  href={source.ratingUrl}
                  rel="noopener"
                  target="_blank"
                >
                  {FACTUAL_LABEL[source.factual]}
                  <span className="sr-only">
                    {" "}
                    (rating for {source.name} on Media Bias/Fact Check)
                  </span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

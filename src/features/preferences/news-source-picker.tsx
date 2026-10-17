import { useId } from "react";
import { LeaningScale, OwnershipBadge } from "#/components/news-source.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import { FieldDescription, FieldLegend, FieldSet } from "#/components/ui/field.tsx";
import {
  averageLeaning,
  countryName,
  isGerman,
  NEWS_SOURCE_PRESETS,
  NEWS_SOURCES,
  type NewsSourceId,
} from "#/lib/news/sources.ts";
import { LEANING_LABEL, type NewsSourceInfo } from "#/lib/news/types.ts";
import { cn } from "#/lib/utils.ts";

const LANGUAGE_NAME = { de: "German", en: "English" } as const;
const GROUPS = [
  { label: "Germany", sources: NEWS_SOURCES.filter(isGerman) },
  { label: "International", sources: NEWS_SOURCES.filter((source) => !isGerman(source)) },
];

function SourceOption({
  source,
  checked,
  onCheckedChange,
}: {
  source: NewsSourceInfo & { id: NewsSourceId };
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-colors",
        checked && "border-highlight bg-highlight/5",
      )}
    >
      <Checkbox
        checked={checked}
        className="mt-0.5"
        id={id}
        onCheckedChange={(next) => onCheckedChange(next)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label className="font-medium leading-none" htmlFor={id}>
          {source.name}
        </label>
        <span className="text-muted-foreground text-xs">
          {countryName(source.country)} · {LANGUAGE_NAME[source.language]} · {source.owner}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <OwnershipBadge source={source} />
          <LeaningScale leaning={source.leaning} />
          <a
            aria-label={`${source.name}: rating on Media Bias/Fact Check`}
            className="text-muted-foreground text-xs underline-offset-2 hover:underline"
            href={source.ratingUrl}
            rel="noopener"
            target="_blank"
          >
            Rating ↗
          </a>
        </span>
      </div>
    </div>
  );
}

/** Multi-select of news outlets, grouped by country, with ownership and political leaning. */
export function NewsSourcePicker({
  value,
  onChange,
  regionChosen,
}: {
  value: readonly NewsSourceId[];
  onChange: (value: NewsSourceId[]) => void;
  regionChosen: boolean;
}) {
  const toggle = (id: NewsSourceId, on: boolean) =>
    onChange(
      NEWS_SOURCES.map((source) => source.id).filter((sourceId) =>
        sourceId === id ? on : value.includes(sourceId),
      ),
    );
  const average = averageLeaning(value);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Quick picks:</span>
        {NEWS_SOURCE_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            onClick={() => onChange([...preset.sources])}
            size="sm"
            type="button"
            variant="outline"
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <p aria-live="polite" className="flex flex-wrap items-center gap-2 text-sm">
        <span>
          {value.length === 1 ? "1 outlet" : `${value.length} outlets`}
          {average ? ` · your mix leans ${LEANING_LABEL[average].toLowerCase()}` : ""}
        </span>
        {average ? <LeaningScale leaning={average} /> : null}
      </p>
      {GROUPS.map((group) => (
        <FieldSet key={group.label}>
          <FieldLegend variant="label">{group.label}</FieldLegend>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.sources.map((source) => (
              <SourceOption
                checked={value.includes(source.id)}
                key={source.id}
                onCheckedChange={(on) => toggle(source.id, on)}
                source={source}
              />
            ))}
          </div>
        </FieldSet>
      ))}
      <FieldDescription>
        When several outlets report the same event, you hear it once, and the host mentions who else
        covered it. Leaning ratings are by{" "}
        <a href="https://mediabiasfactcheck.com/methodology/" rel="noopener" target="_blank">
          Media Bias/Fact Check
        </a>
        , an independent rater: one outside view, not a verdict.
        {regionChosen && !value.includes("tagesschau")
          ? " News from your Bundesland comes from tagesschau, so pick it to keep regional stories."
          : null}
      </FieldDescription>
    </div>
  );
}

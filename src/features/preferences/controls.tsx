import { CheckIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group.tsx";
import { CATEGORIES, type CategoryId } from "#/lib/domain.ts";
import { GENRES, type GenreId } from "#/lib/music.ts";

type Option<T extends string> = {
  readonly id: T;
  readonly label: string;
  readonly description?: string;
};

function findOption<T extends string>(options: readonly Option<T>[], value: unknown) {
  return options.find((option) => option.id === value);
}

/** Single-choice dropdown over a typed option list. */
export function OptionSelect<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
}) {
  const items = options.map((option) => ({ value: option.id, label: option.label }));
  return (
    <Select
      items={items}
      onValueChange={(next) => {
        const match = findOption(options, next);
        if (match) {
          onChange(match.id);
        }
      }}
      value={value}
    >
      <SelectTrigger className="w-full" id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
            {option.description ? (
              <span className="text-muted-foreground"> — {option.description}</span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Segmented single-choice control. Pressing the active item again keeps it selected. */
export function OptionToggle<T extends string>({
  labelledBy,
  value,
  options,
  onChange,
}: {
  labelledBy: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleGroup
      aria-labelledby={labelledBy}
      onValueChange={(next) => {
        const match = findOption(options, next[0]);
        if (match) {
          onChange(match.id);
        }
      }}
      value={[value]}
      variant="outline"
    >
      {options.map((option) => (
        <ToggleGroupItem
          className="px-4 aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          key={option.id}
          value={option.id}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Photo tiles for choosing news sections (multi-select). */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: readonly CategoryId[];
  onChange: (value: CategoryId[]) => void;
}) {
  return (
    <ToggleGroup
      aria-label="News sections"
      className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3"
      multiple={true}
      onValueChange={(next) =>
        onChange(CATEGORIES.map((c) => c.id).filter((id) => next.includes(id)))
      }
      spacing={3}
      value={[...value]}
    >
      {CATEGORIES.map((category) => (
        <ToggleGroupItem
          className="group relative h-28 w-full overflow-hidden rounded-xl border-2 p-0 aria-pressed:border-highlight"
          key={category.id}
          value={category.id}
        >
          <img
            alt=""
            className="absolute inset-0 size-full object-cover opacity-70 transition group-hover:opacity-90 group-aria-pressed:opacity-100"
            decoding="async"
            height={112}
            loading="lazy"
            src={category.image}
            width={200}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
          <span className="absolute bottom-2 left-3 font-semibold text-white">
            {category.label}
          </span>
          {value.includes(category.id) ? (
            <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-highlight text-highlight-foreground">
              <CheckIcon className="size-4" />
            </span>
          ) : null}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Multi-select chips for the genres of account-free catalogues. */
export function GenrePicker({
  value,
  onChange,
}: {
  value: readonly GenreId[];
  onChange: (value: GenreId[]) => void;
}) {
  return (
    <ToggleGroup
      aria-label="Genres"
      className="flex-wrap"
      multiple={true}
      onValueChange={(next) => onChange(GENRES.map((g) => g.id).filter((id) => next.includes(id)))}
      spacing={2}
      value={[...value]}
      variant="outline"
    >
      {GENRES.map((genre) => (
        <ToggleGroupItem
          className="aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          key={genre.id}
          size="sm"
          value={genre.id}
        >
          {genre.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

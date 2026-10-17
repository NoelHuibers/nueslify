import { useForm } from "@tanstack/react-form";
import { useId } from "react";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group.tsx";
import { Slider } from "#/components/ui/slider.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { Switch } from "#/components/ui/switch.tsx";
import {
  AI_PROVIDERS,
  HOST_STYLES,
  LANGUAGES,
  MUSIC_RANGES,
  type Preferences,
  preferencesSchema,
  REGIONS,
  VOICES,
} from "#/lib/domain.ts";
import { describeBalance } from "#/lib/mix.ts";
import {
  chooseSource,
  MUSIC_PROVIDERS,
  musicProvider,
  type SourceAvailability,
} from "#/lib/music.ts";
import { CategoryPicker, GenrePicker, OptionSelect, OptionToggle } from "./controls.tsx";
import { NewsSourcePicker } from "./news-source-picker.tsx";

const NO_REGION = "none";
const REGION_OPTIONS = [
  { id: NO_REGION, label: "No regional news" },
  ...REGIONS.map((region) => ({ id: String(region.id), label: region.name })),
];

function usePreferencesForm(
  initial: Preferences,
  onSubmit: (values: Preferences) => Promise<void>,
) {
  return useForm({
    defaultValues: initial,
    validators: { onChange: preferencesSchema },
    onSubmit: ({ value }) => onSubmit(preferencesSchema.parse(value)),
  });
}

type PreferencesFormApi = ReturnType<typeof usePreferencesForm>;

export function PreferencesForm({
  initial,
  sources,
  submitLabel,
  onSubmit,
}: {
  initial: Preferences;
  sources: readonly SourceAvailability[];
  submitLabel: string;
  onSubmit: (values: Preferences) => Promise<void>;
}) {
  const form = usePreferencesForm(initial, onSubmit);

  return (
    <form
      className="flex flex-col gap-6"
      method="post"
      noValidate={true}
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <AboutYouSection form={form} />
      <HostSection form={form} />
      <MixSection form={form} sources={sources} />
      <NewsSection form={form} />

      <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit] as const}>
        {([isSubmitting, canSubmit]) => (
          <div className="flex justify-end">
            <Button disabled={isSubmitting || !canSubmit} size="lg" type="submit">
              {isSubmitting ? <Spinner /> : null}
              {submitLabel}
            </Button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}

function NewsSection({ form }: { form: PreferencesFormApi }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Your news</CardTitle>
        <CardDescription>
          Pick the outlets you trust and the sections you care about. No section selected means a
          bit of everything.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        <form.Field name="newsSources">
          {(field) => (
            <FieldSet data-invalid={field.state.meta.errors.length > 0}>
              <FieldLegend>Outlets</FieldLegend>
              <form.Subscribe selector={(state) => state.values.regionId !== null}>
                {(regionChosen) => (
                  <NewsSourcePicker
                    onChange={field.handleChange}
                    regionChosen={regionChosen}
                    value={field.state.value}
                  />
                )}
              </form.Subscribe>
              <FieldError errors={field.state.meta.errors} />
            </FieldSet>
          )}
        </form.Field>
        <FieldSet>
          <FieldLegend>Sections</FieldLegend>
          <form.Field name="categories">
            {(field) => <CategoryPicker onChange={field.handleChange} value={field.state.value} />}
          </form.Field>
        </FieldSet>
      </CardContent>
    </Card>
  );
}

function AboutYouSection({ form }: { form: PreferencesFormApi }) {
  const id = useId();
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>About you</CardTitle>
        <CardDescription>
          Your host greets you by name and picks local news from your state.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <form.Field name="displayName">
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor={`${id}-name`}>What should your host call you?</FieldLabel>
                <Input
                  aria-invalid={field.state.meta.errors.length > 0}
                  autoComplete="nickname"
                  id={`${id}-name`}
                  maxLength={40}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
          <form.Field name="regionId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={`${id}-region`}>Your Bundesland</FieldLabel>
                <OptionSelect
                  id={`${id}-region`}
                  onChange={(value) =>
                    field.handleChange(value === NO_REGION ? null : Number(value))
                  }
                  options={REGION_OPTIONS}
                  value={field.state.value === null ? NO_REGION : String(field.state.value)}
                />
              </Field>
            )}
          </form.Field>
          <form.Field name="language">
            {(field) => (
              <Field>
                <FieldLabel id={`${id}-language`}>Show language</FieldLabel>
                <OptionToggle
                  labelledBy={`${id}-language`}
                  onChange={field.handleChange}
                  options={LANGUAGES}
                  value={field.state.value}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function HostSection({ form }: { form: PreferencesFormApi }) {
  const id = useId();
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Your host</CardTitle>
        <CardDescription>Pick a personality and a voice.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <form.Field name="hostStyle">
            {(field) => (
              <FieldSet>
                <FieldLegend variant="label">Style</FieldLegend>
                <RadioGroup
                  className="grid gap-3 sm:grid-cols-3"
                  onValueChange={(value: unknown) => {
                    const match = HOST_STYLES.find((style) => style.id === value);
                    if (match) {
                      field.handleChange(match.id);
                    }
                  }}
                  value={field.state.value}
                >
                  {HOST_STYLES.map((style) => (
                    <FieldLabel htmlFor={`${id}-style-${style.id}`} key={style.id}>
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle>{style.label}</FieldTitle>
                          <FieldDescription>{style.description}</FieldDescription>
                        </FieldContent>
                        <RadioGroupItem id={`${id}-style-${style.id}`} value={style.id} />
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              </FieldSet>
            )}
          </form.Field>
          <div className="grid gap-6 sm:grid-cols-2">
            <form.Field name="voice">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={`${id}-voice`}>Voice</FieldLabel>
                  <OptionSelect
                    id={`${id}-voice`}
                    onChange={field.handleChange}
                    options={VOICES}
                    value={field.state.value}
                  />
                </Field>
              )}
            </form.Field>
            <form.Field name="aiProvider">
              {(field) => (
                <Field>
                  <FieldLabel id={`${id}-provider`}>Script writer</FieldLabel>
                  <OptionToggle
                    labelledBy={`${id}-provider`}
                    onChange={field.handleChange}
                    options={AI_PROVIDERS}
                    value={field.state.value}
                  />
                </Field>
              )}
            </form.Field>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function MixSection({
  form,
  sources,
}: {
  form: PreferencesFormApi;
  sources: readonly SourceAvailability[];
}) {
  const id = useId();
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Your mix</CardTitle>
        <CardDescription>How much news, how much music.</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <form.Field name="balance">
            {(field) => (
              <Field>
                <FieldLabel id={`${id}-balance`}>News ↔ music balance</FieldLabel>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm">News</span>
                  <Slider
                    aria-labelledby={`${id}-balance`}
                    className="min-w-0 flex-1"
                    max={100}
                    min={0}
                    onValueChange={(value) =>
                      field.handleChange(typeof value === "number" ? value : (value[0] ?? 50))
                    }
                    step={5}
                    value={field.state.value}
                  />
                  <span className="text-muted-foreground text-sm">Music</span>
                </div>
                <form.Subscribe selector={(state) => state.values.musicSource}>
                  {(choice) => (
                    <FieldDescription>
                      {describeBalance(field.state.value, chooseSource(sources, choice) !== null)}
                    </FieldDescription>
                  )}
                </form.Subscribe>
              </Field>
            )}
          </form.Field>
          <MusicSourceFields form={form} sources={sources} />
          <form.Field name="mentionTracks">
            {(field) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor={`${id}-mention`}>Host mentions songs by name</FieldLabel>
                  <FieldDescription>
                    Off: song titles are never sent to the AI, and the host just says "more music".
                  </FieldDescription>
                </FieldContent>
                <Switch
                  checked={field.state.value}
                  id={`${id}-mention`}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

const NO_MUSIC = { id: "none", label: "No music — news only" } as const;
const AUTO = { id: "auto", label: "Automatic — my accounts first, then free music" } as const;

function MusicSourceFields({
  form,
  sources,
}: {
  form: PreferencesFormApi;
  sources: readonly SourceAvailability[];
}) {
  const id = useId();
  const options = [
    AUTO,
    ...MUSIC_PROVIDERS.filter((provider) =>
      sources.some((source) => source.id === provider.id && source.configured),
    ).map((provider) => ({
      id: provider.id,
      label: sources.some((source) => source.id === provider.id && source.connected)
        ? provider.label
        : `${provider.label} (not connected)`,
    })),
    NO_MUSIC,
  ];
  return (
    <form.Subscribe selector={(state) => state.values.musicSource}>
      {(choice) => {
        const effective = chooseSource(sources, choice);
        const catalog = effective !== null && musicProvider(effective).kind === "catalog";
        return (
          <>
            <form.Field name="musicSource">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={`${id}-source`}>Play music from</FieldLabel>
                  <OptionSelect
                    id={`${id}-source`}
                    onChange={(value) => {
                      const match = options.find((option) => option.id === value);
                      if (match) {
                        field.handleChange(match.id);
                      }
                    }}
                    options={options}
                    value={field.state.value}
                  />
                  <FieldDescription>
                    {effective
                      ? `Currently: ${musicProvider(effective).label}.`
                      : "No music — the show is news only."}
                  </FieldDescription>
                </Field>
              )}
            </form.Field>
            {catalog ? (
              <form.Field name="genres">
                {(field) => (
                  <FieldSet>
                    <FieldLegend variant="label">Genres</FieldLegend>
                    <FieldDescription>None selected plays what's trending.</FieldDescription>
                    <GenrePicker onChange={field.handleChange} value={field.state.value} />
                  </FieldSet>
                )}
              </form.Field>
            ) : null}
            {effective === "spotify" ? (
              <form.Field name="musicRange">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={`${id}-range`}>Which favourites?</FieldLabel>
                    <OptionSelect
                      id={`${id}-range`}
                      onChange={field.handleChange}
                      options={MUSIC_RANGES}
                      value={field.state.value}
                    />
                  </Field>
                )}
              </form.Field>
            ) : null}
          </>
        );
      }}
    </form.Subscribe>
  );
}

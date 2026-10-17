import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ComponentProps, useState } from "react";
import { z } from "zod";
import { SpotifyIcon } from "#/components/spotify-brand.tsx";
import { Alert, AlertDescription } from "#/components/ui/alert.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { authClient } from "#/lib/auth-client.ts";

type Mode = "sign-in" | "sign-up";

const signInSchema = z.object({
  name: z.string(),
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(1, "What should your host call you?").max(60),
  password: z.string().min(10, "Use at least 10 characters"),
});

type Credentials = z.infer<typeof signInSchema>;

const OAUTH_ERRORS: Record<string, string> = {
  email_not_found:
    "Spotify didn't share an email address. Please sign up with email first, then connect Spotify.",
  access_denied: "Spotify sign-in was cancelled.",
};

const COPY = {
  "sign-in": {
    title: "Welcome back",
    description: "Sign in to tune back in.",
    submit: "Sign in",
    switchPrompt: "New here? ",
    switchLabel: "Create an account",
    switchTo: "/sign-up",
    defaultTarget: "/listen",
  },
  "sign-up": {
    title: "Create your station",
    description: "Takes ten seconds. Your host is warming up.",
    submit: "Create account",
    switchPrompt: "Already listening? ",
    switchLabel: "Sign in",
    switchTo: "/sign-in",
    defaultTarget: "/welcome",
  },
} as const;

function oauthErrorMessage(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  return OAUTH_ERRORS[code] ?? "Sign-in failed. Please try again.";
}

async function submitCredentials(mode: Mode, value: Credentials): Promise<string | null> {
  const result =
    mode === "sign-up"
      ? await authClient.signUp.email({
          name: value.name.trim(),
          email: value.email,
          password: value.password,
        })
      : await authClient.signIn.email({ email: value.email, password: value.password });
  return result.error ? (result.error.message ?? "Something went wrong. Please try again.") : null;
}

export function AuthForm({
  mode,
  spotifyEnabled,
  redirectTo,
  oauthError,
}: {
  mode: Mode;
  spotifyEnabled: boolean;
  redirectTo: string | undefined;
  oauthError: string | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(() => oauthErrorMessage(oauthError));
  const copy = COPY[mode];
  const target = redirectTo ?? copy.defaultTarget;

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: { onSubmit: mode === "sign-up" ? signUpSchema : signInSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const failure = await submitCredentials(mode, value);
      if (failure) {
        setError(failure);
        return;
      }
      await queryClient.invalidateQueries();
      await navigate({ to: target });
    },
  });

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          method="post"
          noValidate={true}
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {mode === "sign-up" ? (
              <form.Field name="name">
                {(field) => (
                  <CredentialField
                    autoComplete="given-name"
                    errors={field.state.meta.errors}
                    label="Your name"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onValueChange={field.handleChange}
                    value={field.state.value}
                  />
                )}
              </form.Field>
            ) : null}
            <form.Field name="email">
              {(field) => (
                <CredentialField
                  autoComplete="email"
                  errors={field.state.meta.errors}
                  inputMode="email"
                  label="Email"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onValueChange={field.handleChange}
                  type="email"
                  value={field.state.value}
                />
              )}
            </form.Field>
            <form.Field name="password">
              {(field) => (
                <CredentialField
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  errors={field.state.meta.errors}
                  label="Password"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onValueChange={field.handleChange}
                  type="password"
                  value={field.state.value}
                />
              )}
            </form.Field>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
                  {isSubmitting ? <Spinner /> : null}
                  {copy.submit}
                </Button>
              )}
            </form.Subscribe>
            {spotifyEnabled ? (
              <SpotifySignIn mode={mode} onError={setError} target={target} />
            ) : null}
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-muted-foreground text-sm">
        {copy.switchPrompt}
        <Link
          className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
          search={redirectTo ? { redirect: redirectTo } : {}}
          to={copy.switchTo}
        >
          {copy.switchLabel}
        </Link>
      </CardFooter>
    </Card>
  );
}

function CredentialField({
  label,
  name,
  value,
  errors,
  onValueChange,
  ...inputProps
}: {
  label: string;
  name: string;
  value: string;
  errors: ({ message?: string } | undefined)[];
  onValueChange: (value: string) => void;
} & Omit<ComponentProps<typeof Input>, "value" | "name" | "id" | "onChange">) {
  const invalid = errors.length > 0;
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        aria-invalid={invalid}
        id={name}
        name={name}
        onChange={(event) => onValueChange(event.target.value)}
        value={value}
        {...inputProps}
      />
      <FieldError errors={errors} />
    </Field>
  );
}

function SpotifySignIn({
  mode,
  target,
  onError,
}: {
  mode: Mode;
  target: string;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);

  const continueWithSpotify = async () => {
    setPending(true);
    const result = await authClient.signIn.social({
      provider: "spotify",
      callbackURL: target,
      newUserCallbackURL: "/welcome",
      errorCallbackURL: `/${mode}`,
    });
    if (result.error) {
      setPending(false);
      onError(result.error.message ?? "Couldn't reach Spotify.");
    }
  };

  return (
    <>
      <FieldSeparator>or</FieldSeparator>
      <Button
        className="w-full"
        disabled={pending}
        onClick={() => void continueWithSpotify()}
        size="lg"
        type="button"
        variant="outline"
      >
        {pending ? <Spinner /> : <SpotifyIcon />}
        Continue with Spotify
      </Button>
    </>
  );
}

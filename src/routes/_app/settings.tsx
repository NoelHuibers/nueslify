import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog.tsx";
import { MusicSources } from "#/features/preferences/music-sources.tsx";
import { PreferencesForm } from "#/features/preferences/preferences-form.tsx";
import { authClient } from "#/lib/auth-client.ts";
import { musicSourcesQuery, preferencesQuery } from "#/lib/queries.ts";
import { updatePreferences } from "#/server/functions/preferences.ts";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · Nueslify" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(preferencesQuery),
      context.queryClient.ensureQueryData(musicSourcesQuery),
    ]),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { viewer } = Route.useRouteContext();
  const { data: prefs } = useSuspenseQuery(preferencesQuery);
  const { data: sources } = useSuspenseQuery(musicSourcesQuery);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-3xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Changes apply from the next part of the show.</p>
      </div>
      <MusicSources returnTo="/settings" sources={sources} />
      <PreferencesForm
        initial={prefs}
        sources={sources}
        onSubmit={async (values) => {
          await updatePreferences({ data: values });
          await queryClient.invalidateQueries({ queryKey: ["preferences"] });
          await queryClient.invalidateQueries({ queryKey: ["viewer"] });
          toast.success("Saved. Your host has taken notes.");
        }}
        submitLabel="Save changes"
      />
      <AccountCard email={viewer.email} />
    </div>
  );
}

function AccountCard({ email }: { email: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const deleteAccount = async () => {
    setPending(true);
    const result = await authClient.deleteUser();
    setPending(false);
    if (result.error) {
      toast.error(result.error.message ?? "Couldn't delete your account.");
      return;
    }
    queryClient.clear();
    toast.success("Your account and listening history were deleted.");
    await navigate({ to: "/" });
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Signed in as {email}</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog>
          <DialogTrigger render={<Button variant="destructive" />}>Delete account</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This removes your account, preferences, listening history, saved stories and Spotify
                connection. It can't be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button disabled={pending} onClick={() => void deleteAccount()} variant="destructive">
                Delete forever
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

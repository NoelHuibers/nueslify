import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProviderAttribution } from "#/components/music-brand.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "#/components/ui/item.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { loadMusicKit } from "#/features/player/backends/apple-music.ts";
import { authClient } from "#/lib/auth-client.ts";
import { MUSIC_PROVIDERS, type MusicProviderId, YOUTUBE_SCOPE } from "#/lib/music.ts";
import {
  connectAppleMusic,
  disconnectMusicSource,
  getPlaybackAuth,
  type MusicSourceView,
} from "#/server/functions/music.ts";

async function connect(provider: MusicProviderId, returnTo: string): Promise<void> {
  const linkSocial = async (options: Parameters<typeof authClient.linkSocial>[0]) => {
    const result = await authClient.linkSocial(options);
    if (result.error) {
      throw new Error(result.error.message ?? "Couldn't reach the service.");
    }
  };
  switch (provider) {
    case "spotify":
      return linkSocial({ provider: "spotify", callbackURL: returnTo });
    case "youtube":
      return linkSocial({ provider: "google", scopes: [YOUTUBE_SCOPE], callbackURL: returnTo });
    case "tidal":
      return linkSocial({ provider: "tidal", callbackURL: returnTo });
    case "apple-music": {
      // MusicKit authorises in a popup and hands back a Music User Token.
      const music = await loadMusicKit(async () => {
        const auth = await getPlaybackAuth({ data: { provider: "apple-music" } });
        if (auth.provider !== "apple-music") {
          throw new Error("Unexpected credentials");
        }
        return auth;
      });
      const musicUserToken = await music.authorize();
      await connectAppleMusic({ data: { musicUserToken } });
      return;
    }
    default:
      return;
  }
}

/** Every music service the server supports, with connect/disconnect for account-based ones. */
export function MusicSources({
  sources,
  returnTo,
}: {
  sources: MusicSourceView[];
  returnTo: string;
}) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["music-sources"] });

  const connectMutation = useMutation({
    mutationFn: (provider: MusicProviderId) => connect(provider, returnTo),
    onSuccess: async () => {
      await refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const disconnectMutation = useMutation({
    mutationFn: (provider: MusicProviderId) => disconnectMusicSource({ data: { provider } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Disconnected.");
    },
    onError: (error) => toast.error(error.message),
  });

  const available = MUSIC_PROVIDERS.flatMap((provider) => {
    const status = sources.find((source) => source.id === provider.id);
    return status?.configured ? [{ provider, status }] : [];
  });
  const pending = (id: MusicProviderId) =>
    (connectMutation.isPending && connectMutation.variables === id) ||
    (disconnectMutation.isPending && disconnectMutation.variables === id);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Music sources</CardTitle>
        <CardDescription>
          Connect a service you already use for your own favourites. Without one, the free
          catalogues below fill the gaps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup className="gap-2">
          {available.map(({ provider, status }) => (
            <Item key={provider.id} role="listitem" size="sm" variant="outline">
              <ItemContent>
                <ItemTitle>
                  {provider.label}
                  {status.experimental ? <Badge variant="outline">Beta</Badge> : null}
                  {provider.kind === "catalog" ? (
                    <Badge variant="secondary">No account needed</Badge>
                  ) : null}
                </ItemTitle>
                <ItemDescription>{provider.description}</ItemDescription>
              </ItemContent>
              <ItemActions>
                {provider.kind === "account" ? (
                  <ConnectionButton
                    canDisconnect={status.canDisconnect}
                    connected={status.connected}
                    label={provider.label}
                    onConnect={() => connectMutation.mutate(provider.id)}
                    onDisconnect={() => disconnectMutation.mutate(provider.id)}
                    pending={pending(provider.id)}
                  />
                ) : (
                  <ProviderAttribution provider={provider.id} size="sm" />
                )}
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

function ConnectionButton({
  label,
  connected,
  canDisconnect,
  pending,
  onConnect,
  onDisconnect,
}: {
  label: string;
  connected: boolean;
  canDisconnect: boolean;
  pending: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (!connected) {
    return (
      <Button
        aria-label={`Connect ${label}`}
        disabled={pending}
        onClick={onConnect}
        size="sm"
        variant="outline"
      >
        {pending ? <Spinner /> : null} Connect
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Badge className="border-highlight/40 text-highlight" variant="outline">
        Connected
      </Badge>
      {canDisconnect ? (
        <Button
          aria-label={`Disconnect ${label}`}
          disabled={pending}
          onClick={onDisconnect}
          size="sm"
          variant="ghost"
        >
          Disconnect
        </Button>
      ) : null}
    </div>
  );
}

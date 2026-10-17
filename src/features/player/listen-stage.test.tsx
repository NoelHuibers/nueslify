import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES, type Segment } from "#/lib/domain.ts";
import type { MusicSourceView } from "#/server/functions/music.ts";
import { FakeAudio } from "../../../test/fake-audio.ts";
import { renderWithProviders } from "../../../test/render.tsx";
import { makeTrack } from "../../../test/tracks.ts";
import { type FetchBlock, PlayerEngine } from "./engine.ts";
import { ListenStage } from "./listen-stage.tsx";
import { PlayerContext } from "./player-context.ts";

vi.mock("#/server/functions/history.ts", () => ({
  setStorySaved: vi.fn(async ({ data }: { data: { saved: boolean } }) => ({ saved: data.saved })),
}));

const source = (id: MusicSourceView["id"], connected: boolean): MusicSourceView => ({
  id,
  configured: true,
  connected,
  experimental: false,
  canDisconnect: true,
});

const freeMusicOnly = [source("spotify", false), source("audius", true)];

const segments: Segment[] = [
  {
    id: "h1",
    kind: "host",
    role: "intro",
    audioUrl: "/a/h1.wav",
    transcript: "Good evening, Ada!",
  },
  {
    id: "n1",
    kind: "news",
    audioUrl: "/a/n1.wav",
    transcript: "The leap second is being abolished.",
    story: {
      id: "s1",
      title: "Die Schaltsekunde wird abgeschafft",
      topline: "Zeitmessung",
      ressort: "wissen",
      regionId: null,
      shareUrl: "https://www.tagesschau.de/wissen/schaltsekunde.html",
      sourceId: "tagesschau",
      alsoReportedBy: ["spiegel", "bbc"],
      publishedAt: "2026-10-16T10:00:00Z",
    },
  },
  {
    id: "m1",
    kind: "music",
    track: makeTrack("t1", { name: "Song One" }),
  },
];

function renderStage(engine: PlayerEngine, sources: MusicSourceView[] = freeMusicOnly) {
  return renderWithProviders(
    <PlayerContext value={engine}>
      <ListenStage name="Ada" prefs={{ ...DEFAULT_PREFERENCES, regionId: 9 }} sources={sources} />
    </PlayerContext>,
  );
}

describe("ListenStage", () => {
  let fetchBlock: FetchBlock;

  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal("Audio", FakeAudio);
    fetchBlock = vi.fn(({ index }) =>
      index === 0
        ? Promise.resolve({ index: 0, segments, notices: ["Spotify is rate limiting requests."] })
        : // The follow-up block is still being prepared.
          new Promise<never>(() => undefined),
    );
  });

  it("greets the listener and summarises their station before the show", async () => {
    renderStage(new PlayerEngine(fetchBlock, () => null));

    expect(await screen.findByRole("heading", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getByText("Friendly host")).toBeInTheDocument();
    expect(screen.getByText("Niedersachsen")).toBeInTheDocument();
    expect(screen.getByText("Music: Audius")).toBeInTheDocument();
    expect(screen.getByText("Want your own favourites?")).toBeInTheDocument();
  });

  it("prefers the listener's own account once connected", async () => {
    renderStage(new PlayerEngine(fetchBlock, () => null), [
      source("spotify", true),
      source("audius", true),
    ]);
    await screen.findByRole("heading", { name: "Ada" });
    expect(screen.getByText("Music: Spotify")).toBeInTheDocument();
    expect(screen.queryByText("Want your own favourites?")).not.toBeInTheDocument();
  });

  it("starts the show, shows the host transcript, notices and the rundown", async () => {
    const engine = new PlayerEngine(fetchBlock, () => null);
    renderStage(engine);

    await userEvent.click(await screen.findByRole("button", { name: "Start the show" }));

    expect(await screen.findByText("Good evening, Ada!")).toBeInTheDocument();
    expect(screen.getByText("Spotify is rate limiting requests.")).toBeInTheDocument();

    const rundown = screen.getByRole("list");
    const items = within(rundown).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveAttribute("aria-current", "true");
    expect(items[3]).toHaveTextContent("Preparing what's next…");
    // Spotify metadata links back to Spotify.
    expect(within(rundown).getByRole("link", { name: "Song One" })).toHaveAttribute(
      "href",
      "https://open.spotify.com/track/t1",
    );
  });

  it("shows the story with its source link and lets the listener save it", async () => {
    const engine = new PlayerEngine(fetchBlock, () => null);
    renderStage(engine);
    await userEvent.click(await screen.findByRole("button", { name: "Start the show" }));
    await screen.findByText("Good evening, Ada!");

    engine.next();

    expect(
      await screen.findByRole("heading", { name: "Die Schaltsekunde wird abgeschafft" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Zeitmessung · tagesschau")).toBeInTheDocument();
    expect(screen.getByText("Also reported by DER SPIEGEL, BBC News")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read on tagesschau.de/ })).toHaveAttribute(
      "href",
      "https://www.tagesschau.de/wissen/schaltsekunde.html",
    );
    const save = screen.getByRole("button", { name: "Save story" });
    await userEvent.click(save);
    expect(await screen.findByRole("button", { name: "Saved" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("dismisses notices", async () => {
    renderStage(new PlayerEngine(fetchBlock, () => null));
    await userEvent.click(await screen.findByRole("button", { name: "Start the show" }));
    await screen.findByText("Spotify is rate limiting requests.");

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Spotify is rate limiting requests.")).not.toBeInTheDocument();
  });
});

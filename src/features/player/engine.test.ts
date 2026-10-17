import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Segment, ShowBlock } from "#/lib/domain.ts";
import { FakeAudio } from "../../../test/fake-audio.ts";
import { makeTrack } from "../../../test/tracks.ts";
import type { BackendEvents, BackendFactory, PlaybackBackend } from "./backends/index.ts";
import { type FetchBlock, PlayerEngine } from "./engine.ts";
import { currentSegment } from "./state.ts";

const host = (id: string): Segment => ({
  id,
  kind: "host",
  role: "intro",
  audioUrl: `/api/audio/${id}.wav`,
  transcript: id,
});
const news = (id: string): Segment => ({
  id,
  kind: "news",
  audioUrl: `/api/audio/${id}.wav`,
  transcript: id,
  story: {
    id,
    title: `Story ${id}`,
    topline: null,
    ressort: "inland",
    regionId: null,
    shareUrl: "https://www.tagesschau.de",
    sourceId: "tagesschau",
    alsoReportedBy: [],
    publishedAt: "2026-10-16T10:00:00Z",
  },
});
const music = (id: string): Segment => ({ id, kind: "music", track: makeTrack(id) });
const streamed = (id: string): Segment => ({
  id,
  kind: "music",
  track: makeTrack(id, { provider: "audius", streamUrl: `https://stream.example/${id}.mp3` }),
});

type FakeBackend = PlaybackBackend & { events: BackendEvents; played: string[] };

/** Backend factory whose backends record calls and let tests fire provider events. */
function fakeBackends(visible = false) {
  const created: FakeBackend[] = [];
  const factory: BackendFactory = (provider, events) => {
    const backend: FakeBackend = {
      provider,
      visible,
      events,
      played: [],
      attach: vi.fn(),
      prepare: vi.fn(),
      play: vi.fn(async (track) => {
        backend.played.push(track.id);
        events.onState("playing");
      }),
      pause: vi.fn(),
      toggle: vi.fn(),
      destroy: vi.fn(),
    };
    created.push(backend);
    return backend;
  };
  return { factory, created };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const audio = () => {
  const instance = FakeAudio.instances.at(-1);
  if (!instance) {
    throw new Error("no audio element created");
  }
  return instance;
};

function blocks(...lists: Segment[][]): FetchBlock {
  const queue = lists.map((segments, index): ShowBlock => ({ index, segments, notices: [] }));
  return vi.fn(async ({ index }) => {
    const next = queue[index];
    if (!next) {
      throw new Error("no more blocks");
    }
    return next;
  });
}

describe("PlayerEngine", () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal("Audio", FakeAudio);
  });

  it("starts the show and plays the first host clip", async () => {
    const fetchBlock = blocks([host("h1"), news("n1"), host("h2"), news("n2")]);
    const engine = new PlayerEngine(fetchBlock, () => null);

    await engine.start();

    expect(fetchBlock).toHaveBeenCalledWith({
      index: 0,
      previous: { kind: "nothing" },
      recentTrackIds: [],
    });
    expect(currentSegment(engine.store.state)?.id).toBe("h1");
    expect(audio().src).toBe("/api/audio/h1.wav");
    expect(engine.store.state.status).toBe("playing");
  });

  it("advances when a clip ends and prefetches the next block in time", async () => {
    const fetchBlock = blocks(
      [host("h1"), news("n1"), host("h2"), news("n2")],
      [host("h3"), news("n3")],
    );
    const engine = new PlayerEngine(fetchBlock, () => null);
    await engine.start();

    audio().finish();
    expect(currentSegment(engine.store.state)?.id).toBe("n1");
    await flush();
    // 2 segments left after n1 → prefetch kicked in with context from the last queued item.
    expect(fetchBlock).toHaveBeenLastCalledWith({
      index: 1,
      previous: { kind: "story", title: "Story n2", topline: null },
      recentTrackIds: [],
    });
    expect(engine.store.state.queue).toHaveLength(6);
  });

  it("toggles and skips", async () => {
    const engine = new PlayerEngine(
      blocks([host("h1"), news("n1"), news("n2"), news("n3"), news("n4")]),
      () => null,
    );
    await engine.start();

    engine.toggle();
    expect(audio().paused).toBe(true);
    expect(engine.store.state.status).toBe("paused");
    engine.toggle();
    expect(engine.store.state.status).toBe("playing");

    engine.next();
    expect(currentSegment(engine.store.state)?.id).toBe("n1");
    expect(audio().src).toBe("/api/audio/n1.wav");
  });

  it("shows an error and retries when the first block fails", async () => {
    const fetchBlock = vi
      .fn<FetchBlock>()
      .mockRejectedValueOnce(new Error("Nothing to play right now."))
      .mockResolvedValueOnce({
        index: 0,
        segments: [host("h1"), news("n1"), news("n2"), news("n3")],
        notices: [],
      });
    const engine = new PlayerEngine(fetchBlock, () => null);

    await engine.start();
    expect(engine.store.state).toMatchObject({
      status: "error",
      error: "Nothing to play right now.",
    });

    engine.retry();
    await flush();
    expect(currentSegment(engine.store.state)?.id).toBe("h1");
    expect(engine.store.state.error).toBeNull();
  });

  it("skips clips that fail to load and tells the listener", async () => {
    const engine = new PlayerEngine(
      blocks([host("h1"), news("n1"), news("n2"), news("n3")]),
      () => null,
    );
    await engine.start();

    audio().fail();
    expect(currentSegment(engine.store.state)?.id).toBe("n1");
    expect(engine.store.state.notices).toEqual(["A segment couldn't be played and was skipped."]);
  });

  it("skips music when no Spotify player is mounted", async () => {
    const engine = new PlayerEngine(
      blocks([host("h1"), music("m1"), news("n1"), news("n2")]),
      () => null,
    );
    await engine.start();

    audio().finish();
    expect(currentSegment(engine.store.state)?.id).toBe("n1");
  });

  it("buffers at the end of the queue until more arrives", async () => {
    const engine = new PlayerEngine(blocks([host("h1")]), () => null);
    await engine.start();
    audio().finish();
    await flush();
    expect(engine.store.state.status).toBe("error");
    expect(engine.store.state.error).toBe("no more blocks");
  });

  it("stops updating state after destroy", async () => {
    const engine = new PlayerEngine(
      blocks([host("h1"), news("n1"), news("n2"), news("n3")]),
      () => null,
    );
    await engine.start();
    engine.destroy();
    const before = engine.store.state;
    audio().dispatchEvent(new Event("play"));
    expect(engine.store.state).toBe(before);
  });

  it("streams open-catalogue songs through the show's own audio element", async () => {
    const { factory, created } = fakeBackends();
    const engine = new PlayerEngine(
      blocks([host("h1"), streamed("s1"), news("n1"), news("n2")]),
      factory,
    );
    await engine.start();

    audio().finish();
    expect(currentSegment(engine.store.state)?.id).toBe("s1");
    expect(audio().src).toBe("https://stream.example/s1.mp3");
    expect(created).toHaveLength(0);

    audio().finish();
    expect(currentSegment(engine.store.state)?.id).toBe("n1");
  });

  it("plays account music through the provider's backend and moves on when it ends", async () => {
    const { factory, created } = fakeBackends();
    const engine = new PlayerEngine(
      blocks([host("h1"), music("m1"), news("n1"), news("n2")]),
      factory,
    );
    await engine.start();
    // The first song's backend is created and warmed up as soon as the block arrives.
    expect(created.map((b) => b.provider)).toEqual(["spotify"]);
    expect(created[0]?.prepare).toHaveBeenCalled();

    audio().finish();
    await flush();
    const [backend] = created;
    expect(backend?.played).toEqual(["m1"]);
    expect(engine.store.state.status).toBe("playing");
    expect(audio().paused).toBe(true);

    backend?.events.onEnded();
    expect(currentSegment(engine.store.state)?.id).toBe("n1");
    expect(backend?.pause).toHaveBeenCalled();
  });

  it("skips a song the provider can't play and says why", async () => {
    const { factory, created } = fakeBackends();
    const engine = new PlayerEngine(
      blocks([host("h1"), music("m1"), news("n1"), news("n2")]),
      factory,
    );
    await engine.start();
    audio().finish();
    await flush();

    created[0]?.events.onError("This video was removed or made private.");
    expect(currentSegment(engine.store.state)?.id).toBe("n1");
    expect(engine.store.state.notices).toContain("This video was removed or made private.");
  });

  it("ignores events from a provider that isn't playing right now", async () => {
    const { factory, created } = fakeBackends();
    const engine = new PlayerEngine(
      blocks([music("m1"), host("h1"), news("n1"), news("n2")]),
      factory,
    );
    await engine.start();
    await flush();
    created[0]?.events.onEnded();
    expect(currentSegment(engine.store.state)?.id).toBe("h1");

    created[0]?.events.onEnded();
    expect(currentSegment(engine.store.state)?.id).toBe("h1");
  });

  it("gives visible players a slot on the dock's stage", async () => {
    const { factory } = fakeBackends(true);
    const engine = new PlayerEngine(
      blocks([host("h1"), music("m1"), news("n1"), news("n2")]),
      factory,
    );
    const stage = document.createElement("div");
    engine.attachStage(stage);
    await engine.start();

    const slot = stage.querySelector<HTMLElement>("[data-provider=spotify]");
    expect(slot).not.toBeNull();
    expect(slot?.hidden).toBe(false);
    expect(engine.store.state.stageProvider).toBe("spotify");
  });
});

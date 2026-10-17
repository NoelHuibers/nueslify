import type { TrackRef } from "#/lib/domain.ts";

/**
 * Offline stand-in for the account-free catalogue (MUSIC_CATALOG=fixture): short tones served
 * from /public/demo, so tests and offline demos can exercise the full music flow.
 */
export const FIXTURE_TRACKS: TrackRef[] = [
  { name: "Morning Tone", artists: ["Nueslify Test Band"], file: "tone-a.wav" },
  { name: "Afternoon Tone", artists: ["Nueslify Test Band"], file: "tone-b.wav" },
  { name: "Evening Tone", artists: ["The Fixtures"], file: "tone-c.wav" },
  { name: "Night Tone", artists: ["The Fixtures"], file: "tone-d.wav" },
  { name: "Encore Tone", artists: ["The Fixtures"], file: "tone-e.wav" },
].map(({ name, artists, file }, index) => ({
  provider: "audius",
  id: `fixture${index}`,
  uri: `fixture${index}`,
  name,
  artists,
  url: `https://audius.co/fixture/${index}`,
  durationMs: 2000,
  streamUrl: `/demo/${file}`,
  credit: { label: "via Audius (demo)", url: `https://audius.co/fixture/${index}` },
}));

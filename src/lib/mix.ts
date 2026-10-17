const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * How many songs and stories go into one block.
 * `balance` runs from 0 (all news) to 100 (all music).
 */
export function segmentCounts(
  balance: number,
  musicAvailable: boolean,
): { tracks: number; stories: number } {
  const tracks = musicAvailable && balance > 0 ? clamp(Math.round(balance / 20), 1, 5) : 0;
  const preferredStories = balance >= 100 ? 0 : clamp(Math.round((100 - balance) / 33), 1, 3);
  // Without music there must be something to play, so fall back to a short news block.
  const stories = tracks === 0 ? Math.max(2, preferredStories) : preferredStories;
  return { tracks, stories };
}

export function describeBalance(balance: number, musicAvailable: boolean): string {
  const { tracks, stories } = segmentCounts(balance, musicAvailable);
  const parts = [
    tracks > 0 ? `${tracks} song${tracks === 1 ? "" : "s"}` : null,
    stories > 0 ? `${stories} stor${stories === 1 ? "y" : "ies"}` : null,
  ].filter((part): part is string => part !== null);
  return `About ${parts.join(" and ")} between host breaks`;
}

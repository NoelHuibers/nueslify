import { env } from "#/server/env.ts";
import { createFixtureSource } from "./fixture.ts";
import { createLiveSource } from "./live.ts";
import type { NewsSource } from "./types.ts";

let source: NewsSource | undefined;

export function newsSource(): NewsSource {
  source ??= env.NEWS_SOURCE === "fixture" ? createFixtureSource() : createLiveSource();
  return source;
}

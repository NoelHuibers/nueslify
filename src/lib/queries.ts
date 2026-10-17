import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { listHistory } from "#/server/functions/history.ts";
import { getMusicSources } from "#/server/functions/music.ts";
import { getPreferences } from "#/server/functions/preferences.ts";
import { getPublicConfig, getViewer } from "#/server/functions/viewer.ts";

export const viewerQuery = queryOptions({
  queryKey: ["viewer"],
  queryFn: () => getViewer(),
  staleTime: 5 * 60_000,
});

export const publicConfigQuery = queryOptions({
  queryKey: ["public-config"],
  queryFn: () => getPublicConfig(),
  staleTime: Number.POSITIVE_INFINITY,
});

export const preferencesQuery = queryOptions({
  queryKey: ["preferences"],
  queryFn: () => getPreferences(),
});

export const musicSourcesQuery = queryOptions({
  queryKey: ["music-sources"],
  queryFn: () => getMusicSources(),
});

export const historyQuery = (savedOnly: boolean) =>
  infiniteQueryOptions({
    queryKey: ["history", { savedOnly }],
    queryFn: ({ pageParam }) => listHistory({ data: { cursor: pageParam, savedOnly } }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });

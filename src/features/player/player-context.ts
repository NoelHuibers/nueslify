import { type UseSelectorOptions, useSelector } from "@tanstack/react-store";
import { createContext, use } from "react";
import type { PlayerEngine } from "./engine.ts";
import type { PlayerState } from "./state.ts";

export const PlayerContext = createContext<PlayerEngine | null>(null);

export function usePlayer(): PlayerEngine {
  const engine = use(PlayerContext);
  if (!engine) {
    throw new Error("usePlayer must be used inside <PlayerProvider>");
  }
  return engine;
}

export function usePlayerState<T>(
  selector: (state: PlayerState) => T,
  options?: UseSelectorOptions<T>,
): T {
  return useSelector(usePlayer().store, selector, options);
}

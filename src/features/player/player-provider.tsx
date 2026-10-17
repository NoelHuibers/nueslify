import { type ReactNode, useEffect, useState } from "react";
import { getNextBlock } from "#/server/functions/show.ts";
import { createBackend } from "./backends/index.ts";
import { PlayerEngine } from "./engine.ts";
import { PlayerContext } from "./player-context.ts";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(
    () => new PlayerEngine((input) => getNextBlock({ data: input }), createBackend),
  );
  useEffect(() => {
    engine.mount();
    return () => engine.destroy();
  }, [engine]);
  return <PlayerContext value={engine}>{children}</PlayerContext>;
}

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

/** Libraries ship "use client" directives for RSC; they are meaningless in these bundles. */
function onwarn<T extends { code?: string }>(warning: T, warn: (warning: T) => void): void {
  if (warning.code !== "MODULE_LEVEL_DIRECTIVE") {
    warn(warning);
  }
}

export default defineConfig({
  build: {
    rolldownOptions: { onwarn },
    // TIDAL's player SDK (~820 kB, with Shaka Player) is a lazy chunk, only fetched when a
    // TIDAL song plays; the main bundle stays small.
    chunkSizeWarningLimit: 900,
  },
  plugins: [
    devtools(),
    nitro({ rolldownConfig: { onwarn } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

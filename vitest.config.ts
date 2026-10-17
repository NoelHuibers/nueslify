import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [viteReact()],
  test: {
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/routeTree.gen.ts", "src/components/ui/**", "src/**/*.test.{ts,tsx}"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["src/server/**/*.test.ts", "src/lib/**/*.test.ts"],
          setupFiles: ["./test/setup-server.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "happy-dom",
          include: ["src/components/**/*.test.tsx", "src/features/**/*.test.{ts,tsx}"],
          setupFiles: ["./test/setup-ui.ts"],
        },
      },
    ],
  },
});

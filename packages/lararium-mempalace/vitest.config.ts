import { defineConfig } from "vitest/config";
import path from "path";

const root = new URL(".", import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: [
      { find: "@lararium/mesh/lar-uris", replacement: path.resolve(root, "../lararium-mesh/src/lar-uris.ts") },
      // /node is a real subpath (repoRoot etc.) used by telemetry-writeback + worldline-kg; the broad
      // `@lararium/mesh` alias below would otherwise swallow it into `<index.ts>/node`. Order: specific first.
      { find: "@lararium/mesh/node", replacement: path.resolve(root, "../lararium-mesh/src/node.ts") },
      { find: "@lararium/mesh", replacement: path.resolve(root, "../lararium-mesh/src/index.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

import { defineConfig } from "vitest/config";
import path from "path";

const root = new URL(".", import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: [
      { find: "@lararium/mesh", replacement: path.resolve(root, "../lararium-mesh/src/index.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The ceremonies drive real Keyhive wasm — first construction pays a load cost the default misreads
    // as a hang. The probes have always run at this speed; the lane simply has to allow for it.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});

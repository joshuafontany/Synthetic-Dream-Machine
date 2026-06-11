import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["e2e/**/*.test.ts"],
    // A staged vessel boots a real daemon (~30s incl. genesis); e2e pacing.
    testTimeout: 180_000,
    hookTimeout: 180_000,
    // One instance per run — no parallel daemons fighting over ports.
    fileParallelism: false,
  },
});

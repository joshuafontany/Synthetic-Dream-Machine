import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // STATED, not inherited. `isolate: true` is vitest's default, and suites here depend on it:
    // several modules hold process-global registries (a Map of holders, memo caches) that no reset
    // clears, so a fresh module registry per file is the only thing returning them to zero. Left
    // implicit, the property disappears the day someone reaches for `isolate: false` for speed —
    // a change that reads as a tuning knob and lands as a correctness change. Written down, it has
    // to be turned off on purpose.
    isolate: true,
    environment: "node",
    include: ["e2e/**/*.test.ts"],
    // A staged vessel boots a real daemon (~30s incl. genesis); e2e pacing.
    testTimeout: 180_000,
    hookTimeout: 180_000,
    // One instance per run — no parallel daemons fighting over ports.
    fileParallelism: false,
  },
});

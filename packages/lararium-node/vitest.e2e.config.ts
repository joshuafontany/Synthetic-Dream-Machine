import { defineConfig } from "vitest/config";
import { alias } from "./vitest.alias";

/** The e2e project — residency / ingest witnesses that stand real vessels.
 *
 * `vitest.config.ts` excludes `tests/e2e/**` from both its projects, so this config alone runs that
 * directory, and it reaches source through the shared alias list rather than a copy of its own.
 */
export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 60_000,
  },
});

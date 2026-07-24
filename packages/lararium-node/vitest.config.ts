import { defineConfig } from "vitest/config";
import path from "path";

const root = new URL(".", import.meta.url).pathname;

const alias = [
  { find: "@lararium/tw5/plugin-tiddler.generated", replacement: path.resolve(root, "../lararium-tw5/src/plugin-tiddler.generated.ts") },
  // Subpath aliases MUST precede the generic "@lararium/tw5" — else the string prefix-match
  // mangles "@lararium/tw5/form-layer" into "src/index.ts/form-layer".
  { find: "@lararium/tw5/form-layer", replacement: path.resolve(root, "../lararium-tw5/src/form-layer/index.ts") },
  { find: "@lararium/tw5/memetic-wikitext-sensorium", replacement: path.resolve(root, "../lararium-tw5/src/memetic-wikitext-sensorium.ts") },
  { find: "@lararium/tw5", replacement: path.resolve(root, "../lararium-tw5/src/index.ts") },
  // Every mesh subpath rides ONE regex → src/<sub>.ts (the bare "@lararium/mesh" below would
  // otherwise swallow subpaths into "src/index.ts/<sub>").
  { find: /^@lararium\/mesh\/(.+)$/, replacement: path.resolve(root, "../lararium-mesh/src") + "/$1.ts" },
  { find: "@lararium/mesh", replacement: path.resolve(root, "../lararium-mesh/src/index.ts") },
];

/**
 * The HEAVY files each stand a live resource that thrashes under 12-way file parallelism: a real
 * WebSocketServer + Automerge Repo + DaemonAuthGate (the crossing tests), or a nested `worker_threads`
 * island booting the full TW5 kernel off the compiled dist (the full-boot tests). Run a dozen at once and
 * the box starves — a `repo.find()` races its sync to "unavailable", and a nested-worker ESM import of an
 * EXISTING dist file fails ERR_MODULE_NOT_FOUND under FD/CPU pressure. Every one passes green alone; only
 * the parallel storm reds them, a DIFFERENT set each run — the signature of contention, not logic.
 *
 * The cure runs these files in ONE serial project (`fileParallelism: false`) so no two heavy resources
 * stand at once, while the ~100 light files keep their full-parallel project. Scoped to the thrashers, the
 * light suite stays fast; the heavy suite trades a little wall-clock for a green it can PROVE under load.
 */
const heavy = [
  // real WebSocketServer + Repo + gate crossings
  "tests/browser-crossing.test.ts",
  "tests/carriage-relay-serve-loop.test.ts",
  "tests/lar-ws-client-adapter.test.ts",
  "tests/nexus-client-dial.test.ts",
  "tests/live-wire-node-crossing.test.ts",
  "tests/daemon-auth-gate.test.ts",
  "tests/authenticated-membership-relay.test.ts",
  "tests/carriage-heal-reconnect.test.ts",
  "tests/carriage-reshare-sniff.test.ts",
  "tests/bulb-kindle.test.ts",
  // nested worker_threads islands booting the full TW5 kernel off dist
  "tests/blob-sovereignty.test.ts",
  "tests/event-routing.test.ts",
  "tests/federation-seam.test.ts",
  "tests/m3-breathing.test.ts",
  "tests/repo-in-island.test.ts",
  "tests/vessel-island-pool.test.ts",
  "tests/pool-mount-intensity.test.ts",
  "tests/verb-tiddler-dispatch.test.ts",
];

export default defineConfig({
  resolve: { alias },
  test: {
    // The host oversubscribes under default per-core parallelism: dozens of these files each spawn their OWN
    // heavy child — a WebSocketServer, a nested worker_threads TW5 island, or a live Python+chroma sidecar — ON
    // TOP of vitest's worker-per-core pool, so peak concurrency runs far past the core count and starves. A
    // starved find() races to "unavailable", a nested import reds ERR_MODULE_NOT_FOUND, a python sidecar times
    // out — a DIFFERENT set each run. Capping the pool holds total concurrency (workers + their children) near
    // the core budget; paired with the serial `heavy` project below, no resource storm ever stands.
    maxWorkers: 4,
    minWorkers: 1,
    projects: [
      {
        resolve: { alias },
        test: {
          name: "heavy",
          environment: "node",
          include: heavy,
          // Serial: one live WS server / nested island at a time — no cross-file resource storm.
          fileParallelism: false,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "main",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/e2e/**", ...heavy],
        },
      },
    ],
  },
});

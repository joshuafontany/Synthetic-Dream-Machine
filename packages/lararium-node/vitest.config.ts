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
 * THE THRASHER CLASSES — the one place they are named, and the reader's only source.
 *
 * A suite standing any of these holds a live resource that starves the box under 12-way file
 * parallelism: a `repo.find()` races its sync to "unavailable", a nested-worker ESM import of an
 * EXISTING dist file reds ERR_MODULE_NOT_FOUND under FD pressure, a python holder times out. Each such
 * suite passes green alone, and a DIFFERENT set reds every run — the signature of contention, never
 * logic. The cure runs them in ONE serial project (`fileParallelism: false`) while the light files keep
 * their full-parallel project.
 *
 * `tests/heavy-roster-is-complete.test.ts` IMPORTS this array and applies it to every suite under
 * `tests/`, so a class named here is a class the reader checks. An earlier shape stated the classes in
 * prose here and re-encoded them as regexes there; the prose named three and the regexes covered two,
 * and four suites standing a python holder sat in the parallel project under a green reader. Two
 * hand-written lists of one fact drift, and the one that carries authority drifts silently. Add a class
 * HERE and the reader picks it up; there is no second list to forget.
 */
export const THRASHERS = [
  { why: "binds a listener", rx: /new WebSocketServer|createServer\s*\(|\.listen\s*\(/ },
  { why: "stands a nested island", rx: /new Worker\s*\(|worker_threads/ },
  { why: "stands a python holder", rx: /composePalace|makeContentPalace|make\w*Palace|composeEncoder|\bspawn\(\s*python/ },
] as const;

/** The suites the serial project takes. Kept complete by the reader that imports {@link THRASHERS}. */
export const heavy = [
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
  "tests/federation-shore.test.ts",
  "tests/m3-breathing.test.ts",
  "tests/repo-in-island.test.ts",
  "tests/vessel-island-pool.test.ts",
  "tests/pool-mount-intensity.test.ts",
  "tests/verb-tiddler-dispatch.test.ts",
  // Surfaced by `tests/heavy-roster-is-complete.test.ts`, which applies the criteria above to every
  // suite in the directory. These four stood a live listener or a nested island while running in the
  // parallel project — the exact condition the split exists to prevent.
  "tests/carriage-cap.test.ts",
  "tests/flow-map-read-face.test.ts",
  "tests/ea-breath-watchdog.test.ts",
  "tests/island-protocol.test.ts",
  // The python-holder class, surfaced when the reader began importing the config's OWN class list
  // instead of re-encoding two of its three. Each spawns a real python+chroma holder from within a
  // vitest worker — the third thrasher the config always named and the reader never checked.
  "tests/content-palace.test.ts",
  "tests/persistence-palace.test.ts",
  "tests/formpalace.test.ts",
  "tests/palace-caps.test.ts",
  "tests/lares-query.test.ts",
  "tests/guest-import.test.ts",
  "tests/embed-cap.test.ts",
  "tests/graph-cap.test.ts",
  "tests/search-cap.test.ts",
];

/**
 * What the parallel project leaves out. Exported because the reader checks that every suite is reachable
 * by SOME project, and a reader that re-states this list is a second copy of one fact — the drift this
 * file already paid for once.
 */
export const mainExclude = ["tests/e2e/**", ...heavy];

export default defineConfig({
  resolve: { alias },
  test: {
    // The host oversubscribes under default per-core parallelism: dozens of these files each spawn their OWN
    // heavy child — a WebSocketServer, a nested worker_threads TW5 island, or a live Python+chroma holder — ON
    // TOP of vitest's worker-per-core pool, so peak concurrency runs far past the core count and starves. A
    // starved find() races to "unavailable", a nested import reds ERR_MODULE_NOT_FOUND, a python holder times
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
          exclude: mainExclude,
        },
      },
    ],
  },
});

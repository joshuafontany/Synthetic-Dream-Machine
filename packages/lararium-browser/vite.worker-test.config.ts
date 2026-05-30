/**
 * vite.worker-test.config.ts — Vite bundle for the browser M.3 breathing gate.
 *
 * Browser Web Workers cannot resolve bare workspace specifiers (`@lararium/mesh`,
 * `@lararium/tw5`) — Vite alias transforms apply only to the main test context.
 * This config produces a self-contained ES module bundle of browser-wiki-worker.ts
 * that a Chromium Worker can load without a module resolution gap.
 *
 * Output: tests/fixtures/browser-wiki-worker-bundle.js
 * Usage:  pnpm --filter @lararium/browser run build:test-worker
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/browser/vite-worker-test-config
 */

import { defineConfig } from "vitest/config";
import wasm from "vite-plugin-wasm";
import path from "path";

const root = new URL(".", import.meta.url).pathname;

export default defineConfig({
  plugins: [wasm()],
  resolve: {
    alias: [
      { find: /^(node:)?crypto$/, replacement: path.resolve(root, "src/__stubs__/crypto-stub.ts") },
      { find: "@lararium/keyhive",               replacement: path.resolve(root, "../lararium-keyhive/src/index.ts") },
      { find: "@lararium/mesh/cascade",          replacement: path.resolve(root, "../lararium-mesh/src/cascade.ts") },
      { find: "@lararium/mesh/lar-uris",         replacement: path.resolve(root, "../lararium-mesh/src/lar-uris.ts") },
      { find: "@lararium/mesh/mirror-paths",     replacement: path.resolve(root, "../lararium-mesh/src/mirror-paths.ts") },
      { find: "@lararium/mesh/promotion-ceremony", replacement: path.resolve(root, "../lararium-mesh/src/promotion-ceremony.ts") },
      { find: "@lararium/mesh/reaction-graph",   replacement: path.resolve(root, "../lararium-mesh/src/reaction-graph.ts") },
      { find: "@lararium/mesh",                  replacement: path.resolve(root, "../lararium-mesh/src/index.ts") },
      { find: "@lararium/tw5",                   replacement: path.resolve(root, "../lararium-tw5/src/index.ts") },
    ],
  },
  // base controls the public path embedded in the bundle for asset URLs.
  // Worker loads bundle from /tests/fixtures/; WASM emitted to /tests/fixtures/assets/.
  // Without this, Vite emits WASM paths as /assets/... which the dev server can't find.
  base: "/tests/fixtures/",
  build: {
    target:      "esnext",
    outDir:      path.resolve(root, "tests/fixtures"),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(root, "src/browser-wiki-worker.ts"),
      output: {
        entryFileNames: "browser-wiki-worker-bundle.js",
        format:         "es",
        codeSplitting:  false,
      },
    },
  },
});

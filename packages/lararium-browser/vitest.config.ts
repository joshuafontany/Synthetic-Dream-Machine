import { defineConfig } from "vitest/config";
import wasm from "vite-plugin-wasm";
import path from "path";

const root = new URL(".", import.meta.url).pathname;

export default defineConfig({
  plugins: [wasm()],
  resolve: {
    alias: [
      // Stub Node's `crypto` module for browser tests — tw5-host-bridge uses createHash.
      { find: /^(node:)?crypto$/, replacement: path.resolve(root, "src/__stubs__/crypto-stub.ts") },
      // Stub Node's `fs`/`path` — the @lararium/mesh barrel re-exports host-only source
      // adapters that carry top-level node:fs / node:path imports; the browser tier only
      // loads their module graph (never runs them), so a load-safe stub keeps the hull whole.
      { find: /^(node:)?fs$/, replacement: path.resolve(root, "src/__stubs__/fs-stub.ts") },
      { find: /^(node:)?path$/, replacement: path.resolve(root, "src/__stubs__/path-stub.ts") },
      { find: "@lararium/keyhive",               replacement: path.resolve(root, "../lararium-keyhive/src/index.ts") },
      { find: "@lararium/mesh/bures-metric",     replacement: path.resolve(root, "../lararium-mesh/src/bures-metric.ts") },
      { find: "@lararium/mesh/cascade",          replacement: path.resolve(root, "../lararium-mesh/src/cascade.ts") },
      { find: "@lararium/mesh/harvest",          replacement: path.resolve(root, "../lararium-mesh/src/harvest.ts") },
      { find: "@lararium/mesh/lar-uris",         replacement: path.resolve(root, "../lararium-mesh/src/lar-uris.ts") },
      { find: "@lararium/mesh/mirror-paths",     replacement: path.resolve(root, "../lararium-mesh/src/mirror-paths.ts") },
      { find: "@lararium/mesh/promotion-ceremony", replacement: path.resolve(root, "../lararium-mesh/src/promotion-ceremony.ts") },
      { find: "@lararium/mesh/reaction-graph",   replacement: path.resolve(root, "../lararium-mesh/src/reaction-graph.ts") },
      { find: "@lararium/mesh",                  replacement: path.resolve(root, "../lararium-mesh/src/index.ts") },
      { find: "@lararium/tw5",                   replacement: path.resolve(root, "../lararium-tw5/src/index.ts") },
    ],
  },
  test: {
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
    },
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});

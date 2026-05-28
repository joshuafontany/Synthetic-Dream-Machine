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
      { find: "@lararium/keyhive",               replacement: path.resolve(root, "../lararium-keyhive/src/index.ts") },
      { find: "@lararium/mesh/cascade",          replacement: path.resolve(root, "../lararium-mesh/src/cascade.ts") },
      { find: "@lararium/mesh/lar-uris",         replacement: path.resolve(root, "../lararium-mesh/src/lar-uris.ts") },
      { find: "@lararium/mesh/mirror-paths",     replacement: path.resolve(root, "../lararium-mesh/src/mirror-paths.ts") },
      { find: "@lararium/mesh/promotion-ceremony", replacement: path.resolve(root, "../lararium-mesh/src/promotion-ceremony.ts") },
      { find: "@lararium/mesh/live-protocol",    replacement: path.resolve(root, "../lararium-mesh/src/live-protocol.ts") },
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

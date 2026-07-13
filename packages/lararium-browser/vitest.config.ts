import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
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
      // Every mesh subpath rides ONE regex → src/<sub>.ts (the bare "@lararium/mesh" below would
      // otherwise swallow subpaths into "src/index.ts/<sub>").
      { find: /^@lararium\/mesh\/(.+)$/, replacement: path.resolve(root, "../lararium-mesh/src") + "/$1.ts" },
      { find: "@lararium/mesh",                  replacement: path.resolve(root, "../lararium-mesh/src/index.ts") },
      { find: "@lararium/tw5",                   replacement: path.resolve(root, "../lararium-tw5/src/index.ts") },
    ],
  },
  test: {
    browser: {
      enabled: true,
      // The provider rides as a FACTORY, never a name: the runner imports the driver it will actually
      // use, so a missing provider fails at config load with the package that is absent — never mid-run
      // with a string nothing resolved.
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
  },
});

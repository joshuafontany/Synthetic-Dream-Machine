import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import wasm from "vite-plugin-wasm";
import path from "path";

const root = new URL(".", import.meta.url).pathname;

export default defineConfig({
  plugins: [wasm()],
  resolve: {
    alias: [
      // Stub Node's `crypto` — tw5-host-bridge reaches for createHash.
      { find: /^(node:)?crypto$/, replacement: path.resolve(root, "src/__stubs__/crypto-stub.ts") },
      // NO `fs`/`path` stub rides here, and none may. The isomorphic `@lararium/mesh` barrel carries no
      // host code — its four transcript adapters sit behind `@lararium/mesh/node` — so the browser hull
      // needs no patch to stay whole. A stub added back here would let a `node:fs` import cross into the
      // hull and pass the suite, which is the leak this configuration exists to keep out.
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

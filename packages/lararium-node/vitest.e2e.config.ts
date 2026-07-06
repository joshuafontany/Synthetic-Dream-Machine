import { defineConfig } from "vitest/config";
import path from "path";

const root = new URL(".", import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: [
      { find: "@lararium/tw5",                    replacement: path.resolve(root, "../lararium-tw5/src/index.ts") },
      // meme-ast resolves to a DIRECTORY barrel — the regex below would mis-map it to src/meme-ast.ts.
      { find: "@lararium/mesh/meme-ast",         replacement: path.resolve(root, "../lararium-mesh/src/meme-ast/index.ts") },
      // Every remaining mesh subpath rides ONE regex → src/<sub>.ts (explicit entries above win first;
      // the bare "@lararium/mesh" below would otherwise swallow subpaths into "src/index.ts/<sub>").
      { find: /^@lararium\/mesh\/(.+)$/, replacement: path.resolve(root, "../lararium-mesh/src") + "/$1.ts" },
      { find: "@lararium/mesh",                  replacement: path.resolve(root, "../lararium-mesh/src/index.ts") },
      { find: "@lararium/keyhive",               replacement: path.resolve(root, "../lararium-keyhive/src/index.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 60_000,
  },
});

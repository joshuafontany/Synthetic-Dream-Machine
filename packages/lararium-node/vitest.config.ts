import { defineConfig } from "vitest/config";
import path from "path";

const root = new URL(".", import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: [
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
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
  },
});

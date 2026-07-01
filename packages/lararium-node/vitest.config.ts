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
      // The meme-ast island scanner — the memetic-wikitext sensorium's disjoint-match reader. Aliased to
      // SOURCE (like form-layer) so vitest resolves the `./meme-ast` subpath the package.json exports; the
      // tw5 main barrel stays parser-free (the pono grammar boundary). MUST precede the generic below.
      { find: "@lararium/tw5/meme-ast", replacement: path.resolve(root, "../lararium-tw5/src/meme-ast/index.ts") },
      { find: "@lararium/tw5", replacement: path.resolve(root, "../lararium-tw5/src/index.ts") },
      { find: "@lararium/mesh/lar-uris", replacement: path.resolve(root, "../lararium-mesh/src/lar-uris.ts") },
      // Subpath alias MUST precede the generic "@lararium/mesh" — else the string
      // prefix-match mangles "@lararium/mesh/node" into "src/index.ts/node".
      { find: "@lararium/mesh/node", replacement: path.resolve(root, "../lararium-mesh/src/node.ts") },
      { find: "@lararium/mesh", replacement: path.resolve(root, "../lararium-mesh/src/index.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
  },
});

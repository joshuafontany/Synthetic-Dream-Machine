import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import arraybuffer from "vite-plugin-arraybuffer";

// Browser-lararium app — Automerge WASM + module Web Workers + a genesis binary.
// Config follows the Automerge "Vite" recipe (research-grounded 2026-06-25):
//   - wasm()        : @automerge/automerge ships its core as .wasm
//   - arraybuffer() : import genesis/island.bin?uint8array as a Uint8Array
// automerge-wasm's top-level-await is handled by the esnext target (build + dev),
// so vite-plugin-top-level-await is NOT needed (and dropping it removes the @swc/core
// native build that snagged pnpm's pre-run deps-check).
export default defineConfig({
  plugins: [wasm(), arraybuffer()],

  // The worker is a SEPARATE rollup build — top-level plugins do NOT inherit, so wasm()
  // must be repeated for the worker to instantiate automerge's wasm. format "es" is
  // mandatory: module workers (new Worker(url,{type:"module"})) only bundle under ES.
  worker: {
    format: "es",
    plugins: () => [wasm()],
  },

  optimizeDeps: {
    // MANDATORY: esbuild pre-bundling would emit a SECOND copy of the automerge-wasm
    // JS wrapper, double-initializing its module-level heap tracker (dev-only heap
    // corruption). Excluding it keeps a single wrapper instance.
    exclude: ["@automerge/automerge-wasm"],
    // Let the dev pre-bundler accept top-level-await (matches build.target).
    esbuildOptions: { target: "esnext" },
  },

  build: { target: "esnext" },

  server: {
    host: true,        // also bind LAN — the home / intranet serving topology
    port: 5173,
    // genesis/island.bin lives at the repo root (outside this package); allow it.
    fs: { allow: [".", "../..", "../../genesis"] },
  },
});

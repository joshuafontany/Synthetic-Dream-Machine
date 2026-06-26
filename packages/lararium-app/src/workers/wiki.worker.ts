// Local worker shim — runs @lararium/browser's wiki-worker body. Vite cannot resolve a worker URL
// that points INTO a dependency package (vitejs/vite#10837); this first-party entry the bundler
// statically sees is the fix. Same keyhive-WASM-first sequence as admin.worker (worker-boot.ts),
// same run().catch so a rejection surfaces instead of a silent module-eval failure.
import { registerWorkerErrorRelay, initKeyhiveWasm } from "./worker-boot.js";

registerWorkerErrorRelay("wiki-worker");

const run = async (): Promise<void> => {
  await initKeyhiveWasm();
  await import("@lararium/browser/browser-wiki-worker");
};
void run().catch((e) => console.error("[wiki-worker] run-threw", e instanceof Error ? e.stack : String(e)));

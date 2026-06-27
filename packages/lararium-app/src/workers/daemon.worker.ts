// Local worker shim — runs @lararium/browser's admin-island body. keyhive WASM instantiates first
// (worker-boot.ts), then the island chain; wrapped in run().catch (NOT top-level await) so a
// rejection surfaces as a logged error instead of a silent module-eval failure.
import { registerWorkerErrorRelay, initKeyhiveWasm } from "./worker-boot.js";

registerWorkerErrorRelay("daemon-worker");

const run = async (): Promise<void> => {
  await initKeyhiveWasm();
  await import("@lararium/browser/browser-daemon-island");
};
void run().catch((e) => console.error("[daemon-worker] run-threw", e instanceof Error ? e.stack : String(e)));

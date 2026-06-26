// BISECT smoke worker — automerge-repo ONLY (no keyhive, no TW5). Mirrors the green
// vitest fixture (browser-repo-in-island-echo.mjs). Proves whether automerge WASM
// instantiates inside THIS app's nested-worker production build (vite preview) — to
// isolate "nested-worker-wasm build broken" from "keyhive/TW5 broken".
self.addEventListener("error", (e) => {
  try { console.error("[smoke-self] error", (e as ErrorEvent).message || (e as ErrorEvent).error?.stack); } catch { /* */ }
});
self.addEventListener("unhandledrejection", (e) => {
  try { console.error("[smoke-self] reject", (e as PromiseRejectionEvent).reason?.stack || (e as PromiseRejectionEvent).reason); } catch { /* */ }
});
console.log("[smoke] worker module top reached");

const run = async (): Promise<void> => {
  const { Repo } = await import("@automerge/automerge-repo");
  console.log("[smoke] automerge-repo imported");
  const repo = new Repo({ sharePolicy: async () => true });
  const handle = repo.create<{ x: number }>();
  handle.change((d) => { d.x = 42; });
  console.log("[smoke] Repo + doc change OK — automerge WASM instantiated, x=", handle.doc()?.x);
  self.postMessage({ type: "smoke-ready", x: handle.doc()?.x });
};
void run().catch((e) => { console.error("[smoke] run threw", e instanceof Error ? e.stack : String(e)); });

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

  // PROOF: keyhive via SLIM + base64 manual init (NO static auto-init, NO asset URL to
  // mis-resolve) — the off-the-module-graph, content-fed path the operator approved.
  console.log("[smoke] keyhive SLIM + base64 init…");
  const KH = await import("@keyhive/keyhive/slim");
  const { wasmBase64 } = await import("@keyhive/keyhive/keyhive_wasm.base64.js");
  KH.initFromBase64Wasm(wasmBase64);
  const KeyhiveType = typeof (KH as unknown as { Keyhive?: unknown }).Keyhive;
  console.log("[smoke] keyhive SLIM init OK — Keyhive:", KeyhiveType);

  // BISECT 3: import the FULL admin chain — catches whatever in browser-admin-island throws
  // at module-eval (the run().catch below logs the stack — the real admin-worker error).
  console.log("[smoke] importing @lararium/browser/browser-admin-island (admin chain)…");
  await import("@lararium/browser/browser-admin-island");
  console.log("[smoke] admin chain imported OK — instantiates");

  self.postMessage({ type: "smoke-ready", x: handle.doc()?.x, keyhive: KeyhiveType });
};
void run().catch((e) => { console.error("[smoke] run threw", e instanceof Error ? e.stack : String(e)); });

// Local worker shim — runs @lararium/browser's wiki-worker body. Vite cannot resolve a
// worker URL that points INTO a dependency package (vitejs/vite#10837); a first-party file
// the bundler statically sees is the fix. Same keyhive-WASM-first sequence as admin.worker
// (the wiki island shares the kernel chain); listeners register first so any throw surfaces.
const report = (label: string, detail: unknown): void => {
  try { console.error("[wiki-self]", label, String(detail).slice(0, 400)); } catch { /* */ }
};
self.addEventListener("error", (e) => report("error", (e as ErrorEvent).message || (e as ErrorEvent).error?.stack || e));
self.addEventListener("unhandledrejection", (e) => report("reject", (e as PromiseRejectionEvent).reason?.stack || (e as PromiseRejectionEvent).reason?.message || (e as PromiseRejectionEvent).reason));

const KH = await import("@keyhive/keyhive/slim");
// @ts-expect-error — keyhive's base64 .d.ts is a `declare module` augmentation, not a module
const { wasmBase64 } = await import("@keyhive/keyhive/keyhive_wasm.base64.js");
(KH as unknown as { initFromBase64Wasm: (s: string) => void }).initFromBase64Wasm(wasmBase64);
await import("@lararium/browser/browser-wiki-worker");

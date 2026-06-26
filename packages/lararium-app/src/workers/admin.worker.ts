// Local worker shim — runs @lararium/browser's admin-island body.
//
// The keyhive WASM must instantiate BEFORE the admin chain evaluates (the slim build does NOT
// auto-init — its `new URL(_bg.wasm, import.meta.url)` would mis-resolve in this worker bundle);
// we feed its wasm as content here, off the module graph. Wrapped in run().catch (NOT top-level
// await) so a rejection surfaces as a logged error instead of a silent module-eval failure.
const report = (label: string, detail: unknown): void => {
  try { console.error("[worker-self]", label, String(detail).slice(0, 600)); } catch { /* */ }
};
self.addEventListener("error", (e) => report("error", (e as ErrorEvent).message || (e as ErrorEvent).error?.stack || e));
self.addEventListener("unhandledrejection", (e) => report("reject", (e as PromiseRejectionEvent).reason?.stack || (e as PromiseRejectionEvent).reason?.message || (e as PromiseRejectionEvent).reason));

const run = async (): Promise<void> => {
  const KH = await import("@keyhive/keyhive/slim");
  // @ts-expect-error — keyhive's base64 .d.ts is a `declare module` augmentation, not a module
  const { wasmBase64 } = await import("@keyhive/keyhive/keyhive_wasm.base64.js");
  (KH as unknown as { initFromBase64Wasm: (s: string) => void }).initFromBase64Wasm(wasmBase64);
  await import("@lararium/browser/browser-admin-island");
};
void run().catch((e) => report("run-threw", e instanceof Error ? e.stack : String(e)));

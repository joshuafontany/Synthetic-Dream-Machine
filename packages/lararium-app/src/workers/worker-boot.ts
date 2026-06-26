// Shared worker-boot parts for the island worker shims (admin · wiki). Both register the same
// self-error relay and instantiate the keyhive WASM the same way before their island chain
// evaluates; only the island body import differs (kept a static literal in each entry so Vite
// statically resolves the worker bundle — vitejs/vite#10837).

/** Register the worker's error + unhandledrejection relay (the worker console doesn't bubble). */
export function registerWorkerErrorRelay(label: string): void {
  const report = (kind: string, detail: unknown): void => {
    try { console.error(`[${label}]`, kind, String(detail).slice(0, 600)); } catch { /* never throw from the relay */ }
  };
  self.addEventListener("error", (e) =>
    report("error", (e as ErrorEvent).message || (e as ErrorEvent).error?.stack || e));
  self.addEventListener("unhandledrejection", (e) =>
    report("reject", (e as PromiseRejectionEvent).reason?.stack || (e as PromiseRejectionEvent).reason?.message || (e as PromiseRejectionEvent).reason));
}

/**
 * Instantiate the keyhive WASM BEFORE the island chain evaluates. The slim build does NOT
 * auto-init (its `new URL(_bg.wasm, import.meta.url)` would mis-resolve in a worker bundle), so we
 * feed the wasm as base64 content here, off the module graph.
 */
export async function initKeyhiveWasm(): Promise<void> {
  const KH = await import("@keyhive/keyhive/slim");
  // @ts-expect-error — keyhive's base64 .d.ts is a `declare module` augmentation, not a module
  const { wasmBase64 } = await import("@keyhive/keyhive/keyhive_wasm.base64.js");
  (KH as unknown as { initFromBase64Wasm: (s: string) => void }).initFromBase64Wasm(wasmBase64);
}

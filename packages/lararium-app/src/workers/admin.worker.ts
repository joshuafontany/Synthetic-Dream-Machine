// Local worker shim (see wiki.worker.ts) — runs @lararium/browser's admin-island body.
// DIAGNOSTIC: register error capture BEFORE the (dynamic) import, so a module-eval throw
// is reported with detail (the main-thread ErrorEvent is security-sanitized to empty).
const report = (label: string, detail: unknown): void => {
  try { console.error("[worker-self]", label, String(detail).slice(0, 400)); } catch { /* */ }
};
self.addEventListener("error", (e) => report("error", (e as ErrorEvent).message || (e as ErrorEvent).error?.stack || e));
self.addEventListener("unhandledrejection", (e) => report("reject", (e as PromiseRejectionEvent).reason?.stack || (e as PromiseRejectionEvent).reason?.message || (e as PromiseRejectionEvent).reason));
await import("@lararium/browser/browser-admin-island");

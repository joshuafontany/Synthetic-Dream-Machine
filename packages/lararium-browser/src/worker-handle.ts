/**
 * browserWorkerHandle — wrap a Web Worker as a platform-blind VesselWorkerHandle
 * (mesh). Shared by the admin VM wrapper and the island pool.
 */

import type { VesselWorkerHandle } from "@lararium/mesh";

export function browserWorkerHandle(w: Worker): VesselWorkerHandle {
  return {
    post: (msg, transfer) => w.postMessage(msg, (transfer ?? []) as Transferable[]),
    listen: (cb) => {
      const fn = (e: MessageEvent): void => cb(e.data);
      w.addEventListener("message", fn);
      return () => w.removeEventListener("message", fn);
    },
    onError: (cb) => {
      const fn = (e: Event): void => {
        const ev = e as ErrorEvent;
        // Surface the real worker throw on the MAIN console (the worker's own console
        // doesn't bubble reliably; ErrorEvent.message is often empty for module workers).
        console.error("[worker-handle] worker error:", ev.message, "@", ev.filename, ev.lineno, ev.error);
        cb(new Error(ev.message || (ev.error instanceof Error ? ev.error.message : "") || "[browser-worker] error"));
      };
      w.addEventListener("error", fn);
      return () => w.removeEventListener("error", fn);
    },
    terminate: () => w.terminate(),
  };
}

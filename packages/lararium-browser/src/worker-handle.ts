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
      const fn = (e: Event): void => cb(new Error((e as ErrorEvent).message || "[browser-worker] error"));
      w.addEventListener("error", fn);
      return () => w.removeEventListener("error", fn);
    },
    terminate: () => w.terminate(),
  };
}

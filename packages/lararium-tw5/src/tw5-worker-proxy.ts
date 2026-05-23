/**
 * TW5WorkerProxy — MemeRecipeVm backed by a Worker Thread (Node) or Web Worker (browser).
 *
 * Spawns a meme-worker-script instance and forwards MemeRecipeVm calls as structured-clone
 * messages. Request/response pairs match by a monotonic id.
 *
 * Fire-and-forget ops (onUriChanged, onSyncComplete, dispose) post without waiting.
 * Query ops (filterTiddlers, renderMeme) return Promises resolved by the response listener.
 *
 * Usage (browser, Vite):
 *   const factory = () => new Worker(new URL("/tw5-worker.js", location.origin), { type: "module" });
 *   const proxy = new TW5WorkerProxy(factory);
 *   await proxy.boot(coreBlob, preloads);
 *   // VM is live — same MemeRecipeVm interface as DirectMemeRecipeVm.
 *
 * Usage (Node Worker Thread):
 *   const factory = () => new NodeWorker(new URL("./tw5-worker.js", import.meta.url));
 *   const proxy = new TW5WorkerProxy(factory);
 *
 * Isomorphic seam: identical interface whether TW5 runs in-process (DirectMemeRecipeVm)
 * or in a Worker thread (TW5WorkerProxy). The VmPool factory is the only construction site.
 *
 * Schema: lar:///ha.ka.ba/@lares/v0.1/api/lararium/schema/tw5-worker-proxy
 */

import type { LarTiddlerChange } from "@lararium/mesh";
import type { MemeRecipeVm } from "@lararium/mesh";

// ---------------------------------------------------------------------------
// Platform-agnostic worker handle — Node Worker Thread or browser Web Worker
// ---------------------------------------------------------------------------

export type AnyWorker = {
  postMessage(data: unknown): void;
  on?(event: string, handler: (data: unknown) => void): void;
  addEventListener?(type: string, handler: (e: MessageEvent) => void): void;
  terminate(): void | Promise<void>;
};

/** Factory supplied by the platform package (@dreamdeck/app or @lararium/node). */
export type WorkerFactory = () => AnyWorker;

// ---------------------------------------------------------------------------
// TW5WorkerProxy
// ---------------------------------------------------------------------------

export class TW5WorkerProxy implements MemeRecipeVm {
  private readonly _worker: AnyWorker;
  private readonly _pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private _seq = 0;

  constructor(workerFactory: WorkerFactory) {
    this._worker = workerFactory();

    const onMessage = (msg: unknown) => {
      const { id, ok, result, error } = msg as {
        id: string; ok: boolean; result?: unknown; error?: string;
      };
      const pending = this._pending.get(id);
      if (!pending) return;
      this._pending.delete(id);
      if (ok) pending.resolve(result);
      else pending.reject(new Error(error ?? "Worker error"));
    };

    if (this._worker.on) {
      // Node Worker Thread
      this._worker.on("message", onMessage);
    } else if (this._worker.addEventListener) {
      // Web Worker
      this._worker.addEventListener("message", (e: MessageEvent) => onMessage(e.data));
    }
  }

  private request<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    const id = String(this._seq++);
    return new Promise<T>((resolve, reject) => {
      this._pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      this._worker.postMessage({ id, type, ...payload });
    });
  }

  private send(type: string, payload: Record<string, unknown> = {}): void {
    this._worker.postMessage({ type, ...payload });
  }

  // -------------------------------------------------------------------------
  // MemeRecipeVm implementation
  // -------------------------------------------------------------------------

  /**
   * Boot the TW5 engine inside the Worker.
   * Must be called before any other operation.
   */
  boot(coreBlob?: Uint8Array, preloads?: Array<Record<string, unknown>>): Promise<void> {
    return this.request("boot", {
      ...(coreBlob ? { coreBlob } : {}),
      ...(preloads ? { preloads } : {}),
    });
  }

  /** Scale 1–3 incremental sync: fire-and-forget, no response expected. */
  onUriChanged(change: LarTiddlerChange): void {
    this.send("onUriChanged", { change });
  }

  /** Flush buffer on island sync complete. Fire-and-forget. */
  onSyncComplete(islandId: string): void {
    this.send("onSyncComplete", { islandId });
  }

  filterTiddlers(expr: string): Promise<string[]> {
    return this.request("filterTiddlers", { expr });
  }

  renderMeme(uri: string): Promise<string | null> {
    return this.request("renderMeme", { uri });
  }

  dispose(): void {
    this.send("dispose");
    // Reject all pending requests — the Worker is going away.
    for (const { reject } of this._pending.values()) {
      reject(new Error("TW5WorkerProxy disposed"));
    }
    this._pending.clear();
    void this._worker.terminate();
  }
}

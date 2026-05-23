/**
 * meme-worker-script — TW5 VM running inside a Worker Thread (Node) or
 * Web Worker (browser).
 *
 * Message protocol — all messages carry { id: string; type: string; ...payload }.
 * Responses: { id: string; ok: boolean; result?: unknown; error?: string }.
 * Fire-and-forget ops (onUriChanged, onSyncComplete, dispose) expect no response.
 *
 * Boot sequence:
 *   1. Parent posts { id, type: "boot", coreBlob?, preloads? }
 *   2. Worker creates TW5Engine, calls boot(coreBlob, preloads)
 *   3. Worker replies { id, ok: true }
 *
 * Incremental sync (Scale 1–3, no response):
 *   { type: "onUriChanged", change: LarTiddlerChange }
 *   { type: "onSyncComplete", islandId: string }
 *
 * Query surface (request/response):
 *   { id, type: "filterTiddlers", expr: string }  → { id, ok: true, result: string[] }
 *   { id, type: "renderMeme",     uri: string }   → { id, ok: true, result: string | null }
 *
 * This is the isomorphic peer-symmetry seam: same message protocol whether the
 * host is a node server or a browser tab. No loadRecords, no renderCarrier.
 *
 * Schema: lar:///ha.ka.ba/@lares/v0.1/api/lararium/schema/meme-worker-script
 */

import { TW5Engine } from "./tw5-vm.js";
import { exportMemeText } from "./meme-write.js";
import type { LarTiddlerChange } from "@lararium/mesh";

// ---------------------------------------------------------------------------
// Worker globals — isomorphic postMessage surface
// ---------------------------------------------------------------------------

declare const self: {
  postMessage(data: unknown): void;
  addEventListener(type: string, handler: (e: MessageEvent) => void): void;
};

// ---------------------------------------------------------------------------
// Engine singleton
// ---------------------------------------------------------------------------

let _engine: TW5Engine | null = null;

function engine(): TW5Engine {
  if (!_engine) throw new Error("meme-worker-script: engine not booted");
  return _engine;
}

// ---------------------------------------------------------------------------
// Message dispatch
// ---------------------------------------------------------------------------

type WorkerMsg = {
  id:         string;
  type:       string;
  coreBlob?:  Uint8Array;
  preloads?:  Array<Record<string, unknown>>;
  change?:    LarTiddlerChange;
  islandId?:  string;
  expr?:      string;
  uri?:       string;
};

function reply(id: string, ok: boolean, result?: unknown, error?: string): void {
  self.postMessage({ id, ok, ...(result !== undefined ? { result } : {}), ...(error ? { error } : {}) });
}

async function dispatch(msg: WorkerMsg): Promise<void> {
  const { id, type } = msg;

  if (type === "boot") {
    _engine = new TW5Engine();
    try {
      await _engine.boot(msg.coreBlob, msg.preloads);
      reply(id, true);
    } catch (e) {
      reply(id, false, undefined, String(e));
    }
    return;
  }

  if (type === "onUriChanged") {
    if (!msg.change) return;
    const change = msg.change;
    const e = engine();
    if (!change.record || change.record.meta?.deleted) {
      e.$tw.wiki.deleteTiddler(change.title);
    } else {
      e.$tw.wiki.addTiddler(new e.$tw.Tiddler(change.record.tiddler));
    }
    return; // fire-and-forget
  }

  if (type === "onSyncComplete") {
    return; // no-op in worker — VM is always live; flush logic here if needed
  }

  if (type === "filterTiddlers") {
    try {
      const result = engine().$tw.wiki.filterTiddlers(msg.expr ?? "");
      reply(id, true, result);
    } catch (e) {
      reply(id, false, undefined, String(e));
    }
    return;
  }

  if (type === "renderMeme") {
    try {
      const text = exportMemeText(engine(), msg.uri ?? "");
      reply(id, true, text || null);
    } catch {
      reply(id, true, null);
    }
    return;
  }

  if (type === "dispose") {
    _engine?.dispose?.();
    _engine = null;
    return;
  }
}

// ---------------------------------------------------------------------------
// Isomorphic message listener — Node Worker Thread or Web Worker
// ---------------------------------------------------------------------------

self.addEventListener("message", (e: MessageEvent) => {
  void dispatch(e.data as WorkerMsg);
});

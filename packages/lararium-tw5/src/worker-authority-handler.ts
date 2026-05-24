/**
 * WorkerAuthorityHandler — isomorphic wiki-worker TW5 lifecycle manager.
 *
 * Owns the TW5Engine lifecycle (boot → live → teardown) inside a Worker realm.
 * Platform-neutral: callers supply a `postFn` that routes WorkerToMainMsg to
 * the main thread via parentPort (Node) or self.postMessage (browser).
 *
 * ## Worker Sovereignty Law — this class's role
 *
 *   This handler owns TW5 only. It does NOT own Automerge WASM, CryptoKeys, or
 *   the Repo-in-Worker sync port. Those belong to the vessel entry file.
 *
 *   Entry file orchestration pattern (all vessels):
 *     1. `await handler.bootTw5(wikiUri, coreBlob)`  — boots TW5, wires verse events
 *     2. entry file: wire Repo with syncPort, await Repo ready, extract initial tiddlers
 *     3. `handler.applyDelta(wikiUri, initialTiddlers, [])`  — seed TW5 from CRDT doc
 *     4. `handler.sendPromoteAck(wikiUri)`  — signal main thread: island is live
 *     5. on Repo change: `handler.applyDelta(wikiUri, added, deleted)` at rAF boundary
 *     6. on teardown: `const result = handler.teardown()`  — dispose TW5, capture snapshot
 *
 * ## What this class owns
 *
 *   TW5Engine   — full TiddlyWiki kernel, in-memory.
 *   live handles — verse-event listeners; cancelled in order on teardown.
 *
 * ## What this class does NOT own
 *
 *   I/O binding     — parentPort / self: stays in vessel entrypoints.
 *   Automerge WASM  — never loaded in this thread. Worker-side Repo lives in the entry file.
 *   CryptoKey       — stays in main thread (GP-4).
 *   syncPort        — MessagePort for Repo sync; consumed by the entry file.
 *   IslandAdaptor   — no CompositeStore in Worker; CRDT feed comes from the Worker-side Repo.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/worker-authority-handler
 */

import { TW5Engine } from "./tw5-vm.js";
import type {
  WorkerToMainMsg,
  WorkerMsg_Event,
} from "@lararium/mesh";
import {
  mkPromoteAck,
  mkTeardownAck,
  mkChangesetAck,
  mkFault,
  WORKER_PROTOCOL_VERSION,
} from "@lararium/mesh";

export interface TeardownResult {
  /**
   * @deprecated GP-3 oracle path snapshot. Survives for NodeVmManager compatibility.
   * Remove when NodeVmManager adopts Repo-in-Worker and exports docBytes on teardown.
   */
  snapshotTiddlers: Record<string, unknown>[];
}

export class WorkerAuthorityHandler {
  private _tw5:        TW5Engine | null = null;
  private _wikiUri:    string | null    = null;
  private readonly _liveHandles         = new Set<{ cancel(): void }>();
  private readonly _post:               (msg: WorkerToMainMsg) => void;

  constructor(postFn: (msg: WorkerToMainMsg) => void) {
    this._post = postFn;
  }

  // ── Worker Sovereignty Law — orchestration API ──────────────────────────

  /**
   * Boot the TW5Engine. Does NOT send `promote:ack` — the entry file
   * sends it after the Worker-side Repo is synced and initial tiddlers applied.
   *
   * Throws (and sends fault) if `coreBlob` carries zero bytes.
   */
  async bootTw5(wikiUri: string, coreBlob: Uint8Array): Promise<void> {
    this._wikiUri = wikiUri;
    if (coreBlob.byteLength === 0) {
      this._postFault(wikiUri, "promote rejected: coreBlob carries zero bytes — authority cannot boot without a TW5 engine");
      throw new Error("zero-byte coreBlob");
    }
    this._tw5 = new TW5Engine();
    await this._tw5.boot(coreBlob);

    this._liveHandles.add({
      cancel: this._tw5.onVerseEvent({
        handleVerseEvent: (uri: string, listenable: string) => {
          this._post({
            schema_version: WORKER_PROTOCOL_VERSION,
            type: "event",
            wikiUri: this._wikiUri!,
            listenable,
            payload: { uri },
          } satisfies WorkerMsg_Event);
        },
      }),
    });
  }

  /**
   * Apply a tiddler add/delete delta to TW5 (from Worker-side Repo change events).
   *
   * Entry files call this at rAF / setInterval drain — not on every incoming message.
   * The Worker owns the timing; this method is synchronous and cheap.
   */
  applyDelta(
    wikiUri: string,
    added:   readonly Record<string, unknown>[],
    deleted: readonly string[],
  ): void {
    if (!this._tw5) return;
    const wiki    = this._tw5.$tw.wiki;
    const Tiddler = this._tw5.$tw.Tiddler;
    for (const fields of added) {
      const title = fields["title"];
      if (typeof title !== "string") continue;
      wiki.addTiddler(new Tiddler(fields as Record<string, unknown>));
    }
    for (const title of deleted) {
      wiki.deleteTiddler(title);
    }
    void wikiUri; // wikiUri reserved for future multi-wiki Worker support
  }

  /** Send `promote:ack` — call after Repo sync complete and initial tiddlers applied. */
  sendPromoteAck(wikiUri: string): void {
    this._post(mkPromoteAck(wikiUri));
  }

  /**
   * Send `changeset:ack` — frame-completion signal (Worker Sovereignty Law §4).
   * Entry files call this at the END of each rAF / setInterval drain cycle.
   * `frameId` is a Worker-generated UUID; it does NOT correlate with a main-thread batch.
   */
  sendChangesetAck(wikiUri: string, frameId: string): void {
    this._post(mkChangesetAck(wikiUri, frameId));
  }

  /**
   * Tear down the TW5Engine and all live handles.
   *
   * Returns a `TeardownResult` with a tiddler snapshot for the GP-3 node path.
   * Entry files should ALSO export Repo doc bytes and include them in `teardown:ack`.
   */
  teardown(): TeardownResult {
    for (const h of this._liveHandles) h.cancel();
    this._liveHandles.clear();
    const snapshotTiddlers = this._captureTiddlers();
    this._tw5?.dispose();
    this._tw5 = null;
    return { snapshotTiddlers };
  }

  // ── Deprecated legacy dispatch ──────────────────────────────────────────

  /**
   * @deprecated Use `bootTw5` / `applyDelta` / `sendPromoteAck` / `teardown` directly.
   *
   * Legacy single-entry dispatch kept for GP-3 compatibility (node fixture Workers,
   * lar-wiki-worker.ts prior to Repo-in-Worker migration). Entry files that adopt
   * the Worker Sovereignty Law should NOT call this method.
   *
   * Handles: promote (boots TW5, sends promote:ack immediately — no Repo sync wait),
   * changeset (applies GP-3 delta), demote/teardown (GP-5 handshake).
   */
  async handleMessage(raw: unknown): Promise<void> {
    if (typeof raw !== "object" || raw === null) return;
    const msg = raw as Record<string, unknown>;
    if (msg["schema_version"] !== WORKER_PROTOCOL_VERSION) return;

    if (msg["type"] === "promote") {
      const wikiUri  = msg["wikiUri"]  as string;
      const coreBlob = msg["coreBlob"] as Uint8Array;
      try {
        await this.bootTw5(wikiUri, coreBlob);
        // Legacy path: send ack immediately (no Repo sync wait).
        // Worker Sovereignty Law is NOT satisfied here — island has no CRDT truth of its own.
        this.sendPromoteAck(wikiUri);
      } catch {
        // fault already sent by bootTw5
      }
      return;
    }

    if (msg["type"] === "changeset") {
      // @deprecated GP-3 oracle delta from main thread.
      if (!this._tw5) return;
      this.applyDelta(
        msg["wikiUri"] as string,
        msg["added"]   as readonly Record<string, unknown>[],
        msg["deleted"] as readonly string[],
      );
      this.sendChangesetAck(msg["wikiUri"] as string, msg["batch_id"] as string);
      return;
    }

    if (msg["type"] === "demote" || msg["type"] === "teardown") {
      const result = this.teardown();
      this._post(mkTeardownAck({ snapshotTiddlers: result.snapshotTiddlers }));
      return;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * @deprecated GP-3 tiddler snapshot. Survives for NodeVmManager warm-start compatibility.
   * Remove when NodeVmManager exports Repo doc bytes on teardown instead.
   */
  private _captureTiddlers(): Record<string, unknown>[] {
    if (!this._tw5) return [];
    try {
      const wiki   = this._tw5.$tw.wiki;
      const titles = wiki.filterTiddlers("[all[tiddlers]!prefix[$:/]]") as string[];
      return titles
        .map((t: string) => wiki.getTiddler(t) as { fields: Record<string, unknown> } | undefined)
        .filter((t): t is { fields: Record<string, unknown> } => t !== undefined)
        .map((t) => ({ ...t.fields }));
    } catch {
      return [];
    }
  }

  private _postFault(uri: string, err: unknown): void {
    this._post(mkFault(uri, String(err)));
  }
}

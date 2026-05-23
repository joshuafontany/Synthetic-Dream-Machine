/**
 * WorkerAuthorityHandler — isomorphic wiki-worker message handler.
 *
 * Owns the TW5Engine lifecycle (promote → live → teardown) inside a Worker realm.
 * Platform-neutral: callers supply a `postFn` that sends WorkerToMainMsg to the
 * main thread via parentPort (Node) or self.postMessage (browser).
 *
 * ## What this class owns
 *
 *   TW5Engine   — full TiddlyWiki kernel, in-memory, booted from snapshotTiddlers.
 *   live handles — verse-event listeners; cancelled in order on teardown.
 *
 * ## What this class does NOT own
 *
 *   I/O binding     — parentPort / self / BroadcastChannel: stays in vessel entrypoints.
 *   Automerge WASM  — never loaded in this thread (GP-3).
 *   CryptoKey       — stays in main thread (GP-4).
 *   IslandAdaptor   — no CompositeStore; main thread feeds changesets.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/worker-authority-handler
 */

import { TW5Engine } from "./tw5-vm.js";
import type {
  MainToWorkerMsg,
  WorkerToMainMsg,
  WorkerMsg_Event,
} from "@lararium/mesh";
import {
  isMainToWorkerMsg,
  mkPromoteAck,
  mkTeardownAck,
  mkFault,
  WORKER_PROTOCOL_VERSION,
} from "@lararium/mesh";

export class WorkerAuthorityHandler {
  private _tw5:        TW5Engine | null = null;
  private _wikiUri:    string | null    = null;
  private readonly _liveHandles         = new Set<{ cancel(): void }>();
  private readonly _post:               (msg: WorkerToMainMsg) => void;

  constructor(postFn: (msg: WorkerToMainMsg) => void) {
    this._post = postFn;
  }

  // ── Public entry point ──────────────────────────────────────────────────

  async handleMessage(raw: unknown): Promise<void> {
    if (!isMainToWorkerMsg(raw)) {
      if (this._wikiUri) {
        this._postFault(this._wikiUri, `unexpected message shape: ${JSON.stringify(raw)}`);
      }
      return;
    }
    await this._dispatch(raw);
  }

  // ── Private dispatch ────────────────────────────────────────────────────

  private async _dispatch(msg: MainToWorkerMsg): Promise<void> {
    if (msg.type === "promote") {
      this._wikiUri = msg.wikiUri;
      if (msg.coreBlob.byteLength === 0) {
        this._postFault(msg.wikiUri, "promote rejected: coreBlob carries zero bytes — authority cannot boot without a TW5 engine");
        return;
      }
      try {
        this._tw5 = new TW5Engine();
        const tiddlers = msg.snapshotTiddlers;
        await this._tw5.boot(
          msg.coreBlob,
          tiddlers && tiddlers.length > 0
            ? (tiddlers as Record<string, unknown>[])
            : undefined,
        );

        // reaction-router.ts TW5 startup module fires tm-verse-event after each nalu.
        // Forward those events to main as WorkerMsg_Event for vm-ring routing.
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

        this._post(mkPromoteAck(msg.wikiUri));
      } catch (err) {
        this._postFault(msg.wikiUri, err);
      }
      return;
    }

    if (msg.type === "changeset") {
      if (!this._tw5) return; // promote not yet complete — drop
      const wiki    = this._tw5.$tw.wiki;
      const Tiddler = this._tw5.$tw.Tiddler;
      for (const fields of msg.added) {
        const title = fields["title"];
        if (typeof title !== "string") continue;
        wiki.addTiddler(new Tiddler(fields as Record<string, unknown>));
      }
      for (const title of msg.deleted) {
        wiki.deleteTiddler(title);
      }
      // reaction-router.ts fires tm-verse-event after TW5 processes the nalu.
      return;
    }

    if (msg.type === "demote" || msg.type === "teardown") {
      this._runTeardown();
      return;
    }
  }

  // ── Teardown ────────────────────────────────────────────────────────────

  private _runTeardown(): void {
    for (const h of this._liveHandles) h.cancel();
    this._liveHandles.clear();

    const snapshotTiddlers = this._captureTiddlers();
    this._tw5?.dispose();
    this._tw5 = null;

    this._post(mkTeardownAck(snapshotTiddlers));
  }

  // ── Tiddler snapshot ────────────────────────────────────────────────────

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

  // ── Fault helper ────────────────────────────────────────────────────────

  private _postFault(uri: string, err: unknown): void {
    this._post(mkFault(uri, String(err)));
  }
}

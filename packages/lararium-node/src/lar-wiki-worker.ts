/**
 * lar-wiki-worker — wiki Worker entry point.
 *
 * One instance runs per hot-tier wiki slot. Owns a TW5Engine (and in P.3.5
 * a ReactionEngine) co-located in the Worker thread, providing synchronous
 * in-thread reads with no StructuredClone overhead on the hot path.
 * The worker owns live wiki reaction once promoted; the main thread should
 * feed snapshots, changesets, and teardown only.
 *
 * ## Lifecycle (GP-5 contract)
 *
 *   main                          Worker
 *   ────                          ──────
 *   new Worker(url)               → thread boots, awaits first message
 *   postMessage(promote)          → boot TW5 from snapshotTiddlers
 *                                 ← promote:ack
 *   postMessage(changeset, [...]) → apply to local AM replica (P.3.5)
 *                                 ← event (RE reaction, P.3.5)
 *   postMessage(teardown)         → cancel live KumuCancelable handles
 *                                 ← teardown:ack (+ snapshotTiddlers)
 *   worker.terminate()            → thread terminates
 *
 * ## What runs in this thread
 *
 *   TW5Engine — full TiddlyWiki kernel, in-memory, booted from snapshotTiddlers.
 *   reaction-router.ts — TW5 startup module; fires tm-verse-event after each nalu.
 *   onVerseEvent — bridges tm-verse-event → WorkerMsg_Event to main thread.
 *   Automerge local replica — TODO P.3.5: apply changeset bytes, diff → TW5 sync.
 *
 * ## What does NOT run in this thread
 *
 *   IslandAdaptor — no CompositeStore access; main thread feeds changesets.
 *   Automerge-repo / DocHandle — Worker holds a local replica, not a live handle.
 *   WebSocket / network — main thread owns all I/O.
 *   CryptoKey material — stays in main thread (GP-4).
 *
 * Covenant pressure:
 *   As ReactionEngine grows, keep authority here narrow and explicit: live wiki
 *   evaluation in-thread, edge I/O and capability material outside.
 *
 * Meme: lar:///ha.ka.ba/@lararium/node/v0.1/lar-wiki-worker
 */

import { parentPort } from "worker_threads";
import { TW5Engine } from "@lararium/tw5";
import {
  isMainToWorkerMsg,
  mkPromoteAck,
  mkTeardownAck,
  mkFault,
  WORKER_PROTOCOL_VERSION,
} from "./lar-worker-protocol.js";
import type { WorkerToMainMsg, WorkerMsg_Event } from "./lar-worker-protocol.js";

if (!parentPort) {
  throw new Error("[lar-wiki-worker] parentPort is null — must run as a Worker thread.");
}

// ---------------------------------------------------------------------------
// Per-slot state
// ---------------------------------------------------------------------------

let tw5:     TW5Engine | null = null;
let wikiUri: string | null   = null;

/** Live cancellable handles — cancelled in order on teardown. */
const liveHandles = new Set<{ cancel(): void }>();

// ---------------------------------------------------------------------------
// Post helper — typed send to main
// ---------------------------------------------------------------------------

function post(msg: WorkerToMainMsg): void {
  parentPort!.postMessage(msg);
}

function postFault(uri: string, err: unknown): void {
  post(mkFault(uri, String(err)));
}

// ---------------------------------------------------------------------------
// Tiddler snapshot — materialize TW5 state to plain objects
// ---------------------------------------------------------------------------

function captureTiddlers(): Record<string, unknown>[] {
  if (!tw5) return [];
  try {
    const wiki   = tw5.$tw.wiki;
    const titles = wiki.filterTiddlers("[all[tiddlers]!prefix[$:/]]") as string[];
    return titles
      .map((t: string) => wiki.getTiddler(t) as { fields: Record<string, unknown> } | undefined)
      .filter((t): t is { fields: Record<string, unknown> } => t !== undefined)
      .map((t) => ({ ...t.fields }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// GP-5 teardown sequence (shared by teardown + demote)
// ---------------------------------------------------------------------------

function runTeardown(): void {
  // Cancel all live KumuCancelable handles before sending ack.
  for (const h of liveHandles) h.cancel();
  liveHandles.clear();

  const snapshotTiddlers = captureTiddlers();

  // Dispose TW5Engine — frees V8 heap before main calls worker.terminate().
  tw5?.dispose();
  tw5 = null;

  post(mkTeardownAck(snapshotTiddlers));
  // Thread stays alive until main calls worker.terminate().
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

parentPort.on("message", async (raw: unknown) => {
  if (!isMainToWorkerMsg(raw)) {
    if (wikiUri) postFault(wikiUri, `unexpected message shape: ${JSON.stringify(raw)}`);
    return;
  }

  // ── promote ────────────────────────────────────────────────────────────
  if (raw.type === "promote") {
    wikiUri = raw.wikiUri;
    try {
      tw5 = new TW5Engine();
      const tiddlers = raw.snapshotTiddlers;
      await tw5.boot(
        raw.coreBlob,
        tiddlers && tiddlers.length > 0
          ? (tiddlers as Record<string, unknown>[])
          : undefined,
      );

      // reaction-router.ts (TW5 startup module) handles nalu-driven binding
      // maintenance and tm-verse-event dispatch. Wire onVerseEvent
      // to forward those events to main as WorkerMsg_Event for vm-ring routing.
      liveHandles.add({
        cancel: tw5.onVerseEvent({
          handleVerseEvent(uri: string, listenable: string) {
            post({
              schema_version: WORKER_PROTOCOL_VERSION,
              type: "event",
              wikiUri: wikiUri!,
              listenable: listenable,
              payload: { uri },
            } satisfies WorkerMsg_Event);
          },
        }),
      });

      post(mkPromoteAck(wikiUri));
    } catch (err) {
      postFault(wikiUri, err);
    }
    return;
  }

  // ── changeset ──────────────────────────────────────────────────────────
  if (raw.type === "changeset") {
    if (!tw5) return; // promote not yet complete — drop
    const wiki = tw5.$tw.wiki;
    const Tiddler = tw5.$tw.Tiddler;

    for (const fields of raw.added) {
      const title = fields["title"];
      if (typeof title !== "string") continue;
      wiki.addTiddler(new Tiddler(fields as Record<string, unknown>));
    }
    for (const title of raw.deleted) {
      wiki.deleteTiddler(title);
    }
    // reaction-router.ts fires tm-verse-event after TW5 processes the nalu.
    return;
  }

  // ── demote ─────────────────────────────────────────────────────────────
  // P.3 alpha: demote = teardown (thread terminates; main re-promotes when needed).
  // P.3.5 upgrade path: demote could instead pause RE and post demote:ack while
  // keeping the thread alive for fast re-promote.
  if (raw.type === "demote") {
    runTeardown();
    return;
  }

  // ── teardown ───────────────────────────────────────────────────────────
  if (raw.type === "teardown") {
    runTeardown();
    return;
  }
});

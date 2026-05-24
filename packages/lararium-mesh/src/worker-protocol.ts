/**
 * worker-protocol — GP-1 schema: discriminated union for all main ↔ wiki-Worker messages.
 *
 * Every message crossing the main-thread / wiki-Worker boundary MUST use this envelope.
 *
 * ## Worker Sovereignty Law (isomorphic across all vessel types)
 *
 *   1. Every Worker boots a Repo-in-Worker via a transferred `syncPort` (MessagePort).
 *   2. The Worker derives tiddler state from its own CRDT doc — never from main-thread oracle deltas.
 *   3. The Worker owns its timing. Browser: requestAnimationFrame (Chromium/Firefox) with
 *      setTimeout(16ms) fallback for Safari (no rAF in Workers as of 2026). Node:
 *      setInterval(16ms).unref(). Tiddler deltas accumulate; the Worker drains at each
 *      frame boundary (or frame-equivalent tick), never on raw message receipt.
 *   4. `changeset:ack` is a frame-completion signal: the Worker fires it after each rAF drain,
 *      signalling the causal island processed a frame. It is NOT a per-batch correlation ACK.
 *   5. `WorkerMsg_Changeset` is @deprecated — CRDT sync via `syncPort` replaces it.
 *      It survives only for the Node GP-3 oracle path pending NodeVmManager migration.
 *   6. `WorkerMsg_Promote` carries `syncPort` (transferred, not cloned), `docUrl` (AutomergeUrl
 *      for `repo.find()`), `coreBlob`, and `coreHash` (content-address intent vector; null = pre-CAS).
 *   7. The vessel MUST close `mainPort` at evict/unmount time — before or after worker.terminate().
 *      Failure to close leaks the Automerge NetworkAdapter silently. This invariant is structural:
 *      every vessel implementation (node, browser, future) holds a `mainPort: MessagePort` on its
 *      hot slot and calls `mainPort.close()` in its teardown path. No exceptions.
 *
 * GP-1: schema_version on every message. Lock at 1; increment on breaking changes.
 * GP-2: all payloads are plain objects; no class instances, no functions, no DOM.
 * GP-3: @deprecated — tiddler-delta oracle path. Worker-side Repo replaces it.
 * GP-4: CryptoKey — NOT on this protocol surface; key material stays in-thread.
 *
 * Platform-neutral: no Node `worker_threads` import, no browser `self` import.
 * Vessel entrypoints bind the I/O; this module names the envelopes only.
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/mesh/worker-protocol
 */

export const WORKER_PROTOCOL_VERSION = 1 as const;
export type ProtocolVersion = typeof WORKER_PROTOCOL_VERSION;

// ── Main → Worker ──────────────────────────────────────────────────────────

/**
 * Promote the wiki slot from cold to hot (boot TW5 + Repo-in-Worker).
 *
 * Worker Sovereignty Law:
 *   - `syncPort` MUST be transferred (not cloned): `postMessage(msg, [msg.syncPort])`.
 *   - Worker creates its own Automerge Repo with `MessageChannelNetworkAdapter(syncPort)`.
 *   - Worker calls `repo.find(docUrl)` and awaits `handle.whenReady()` before `promote:ack`.
 *   - If `docUrl` is null the Worker creates a fresh empty doc (cold boot).
 *   - `coreHash` carries a SHA-256 hex of `coreBlob`; null = pre-content-addressed trust-on-delivery.
 *     This field is an intent vector: once a CAS store exists, null MUST be rejected at boot.
 *
 * BA-5: `coreBlob` travels as Uint8Array; transferred at the postMessage call site.
 */
export interface WorkerMsg_Promote {
  schema_version: ProtocolVersion;
  type: "promote";
  wikiUri: string;
  /** Serialized TW5 core. Transfer alongside syncPort: `postMessage(msg, [coreBlob.buffer, syncPort])`. */
  coreBlob: Uint8Array;
  /** SHA-256 hex of coreBlob. null = pre-CAS trust-on-delivery (intent: make non-null once CAS lands). */
  coreHash: string | null;
  /** AutomergeUrl — Worker calls `repo.find(docUrl)`. null = cold boot, Worker creates fresh doc. */
  docUrl: string | null;
  /** MessagePort for Worker-side Repo ↔ main-thread Repo sync. MUST be transferred. */
  syncPort: MessagePort;
}

/**
 * Deliver a tiddler-level delta to the wiki Worker.
 *
 * @deprecated GP-3 oracle topology. Worker derives tiddler deltas from its own Repo.
 * Survives for Node path compatibility pending NodeVmManager migration to Repo-in-Worker.
 * Remove when NodeVmManager adopts Repo-in-Worker (tracked: GP-3 debt, node-vm-manager.ts).
 */
export interface WorkerMsg_Changeset {
  schema_version: ProtocolVersion;
  type: "changeset";
  wikiUri: string;
  /** Opaque identifier. In Repo-in-Worker path: frame correlation ID (not a main-thread batch ID). */
  batch_id: string;
  added:   readonly Record<string, unknown>[];
  deleted: readonly string[];
}

/** Demote the wiki slot from hot to cold (teardown; thread may terminate). */
export interface WorkerMsg_Demote {
  schema_version: ProtocolVersion;
  type: "demote";
  wikiUri: string;
}

/**
 * Begin the GP-5 teardown handshake.
 * Worker MUST complete in-flight reactions, cancel all live handles, export Repo doc bytes,
 * then respond with `teardown:ack` before main calls worker.terminate().
 */
export interface WorkerMsg_Teardown {
  schema_version: ProtocolVersion;
  type: "teardown";
}

/** All messages the main thread may send to a wiki Worker. */
export type MainToWorkerMsg =
  | WorkerMsg_Changeset
  | WorkerMsg_Promote
  | WorkerMsg_Demote
  | WorkerMsg_Teardown;

// ── Worker → Main ──────────────────────────────────────────────────────────

/**
 * Emit a verse-event reaction to the main thread for cross-wiki routing.
 * GP-2: payload MUST contain only string | number | boolean values.
 */
export interface WorkerMsg_Event {
  schema_version: ProtocolVersion;
  type: "event";
  wikiUri: string;
  listenable: string;
  payload: Record<string, string | number | boolean>;
}

/**
 * GP-5 handshake completion.
 * Sent after all in-flight reactions complete and all live handles cancelled.
 * Main calls worker.terminate() on receipt.
 */
export interface WorkerMsg_TeardownAck {
  schema_version: ProtocolVersion;
  type: "teardown:ack";
  /** Automerge doc bytes from Worker-side Repo at teardown. Preferred warm-start seed. */
  docBytes?: Uint8Array;
  /**
   * @deprecated GP-3 tiddler snapshot. Remove when NodeVmManager migrates to Repo-in-Worker.
   * Use docBytes (CRDT truth) instead.
   */
  snapshotTiddlers?: readonly Record<string, unknown>[];
}

/** Acknowledgement of successful hot-tier boot (TW5 live, Repo synced, first frame ready). */
export interface WorkerMsg_PromoteAck {
  schema_version: ProtocolVersion;
  type: "promote:ack";
  wikiUri: string;
}

/**
 * Worker fault signal. Main MUST mark the slot as evicted.
 */
export interface WorkerMsg_Fault {
  schema_version: ProtocolVersion;
  type: "fault";
  wikiUri: string;
  error: string;
}

/**
 * Frame-completion signal — Worker-owned timing (Worker Sovereignty Law §4).
 *
 * The Worker fires this after each rAF (browser) / setInterval (Node) drain cycle.
 * It signals the causal island processed a frame — main thread may use it to track
 * island liveness. `batch_id` is a frame-local UUID; it does NOT correlate with
 * a main-thread batch in the Repo-in-Worker path.
 *
 * @deprecated name "changeset:ack" reflects the GP-3 origin. Future schema_version
 * will rename to "frame:ack" when the GP-3 path is fully removed.
 */
export interface WorkerMsg_ChangesetAck {
  schema_version: ProtocolVersion;
  type: "changeset:ack";
  wikiUri: string;
  batch_id: string;
}

/** All messages a wiki Worker may send to the main thread. */
export type WorkerToMainMsg =
  | WorkerMsg_Event
  | WorkerMsg_TeardownAck
  | WorkerMsg_PromoteAck
  | WorkerMsg_ChangesetAck
  | WorkerMsg_Fault;

// ── Type guards ────────────────────────────────────────────────────────────

function _hasVersion(v: unknown): v is { schema_version: ProtocolVersion; type: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as Record<string, unknown>).schema_version === WORKER_PROTOCOL_VERSION &&
    typeof (v as Record<string, unknown>).type === "string"
  );
}

export function isMainToWorkerMsg(v: unknown): v is MainToWorkerMsg {
  if (!_hasVersion(v)) return false;
  return (["changeset", "promote", "demote", "teardown"] as const).includes(
    v.type as MainToWorkerMsg["type"],
  );
}

export function isWorkerToMainMsg(v: unknown): v is WorkerToMainMsg {
  if (!_hasVersion(v)) return false;
  return (["event", "teardown:ack", "promote:ack", "changeset:ack", "fault"] as const).includes(
    v.type as WorkerToMainMsg["type"],
  );
}

// ── Envelope factories ─────────────────────────────────────────────────────

export function mkTeardown(): WorkerMsg_Teardown {
  return { schema_version: WORKER_PROTOCOL_VERSION, type: "teardown" };
}

export function mkTeardownAck(opts: {
  docBytes?: Uint8Array;
  /** @deprecated GP-3 path only. */
  snapshotTiddlers?: readonly Record<string, unknown>[];
} = {}): WorkerMsg_TeardownAck {
  const msg: WorkerMsg_TeardownAck = { schema_version: WORKER_PROTOCOL_VERSION, type: "teardown:ack" };
  if (opts.docBytes !== undefined)        msg.docBytes = opts.docBytes;
  if (opts.snapshotTiddlers !== undefined) msg.snapshotTiddlers = opts.snapshotTiddlers;
  return msg;
}

/**
 * Create a promote message.
 *
 * TRANSFER: caller MUST include `syncPort` (and `coreBlob.buffer` if not yet transferred)
 * in the `postMessage` transfer list:
 *   `worker.postMessage(msg, [msg.syncPort, msg.coreBlob.buffer])`
 */
export function mkPromote(
  wikiUri: string,
  coreBlob: Uint8Array,
  syncPort: MessagePort,
  docUrl:   string | null = null,
  coreHash: string | null = null,
): WorkerMsg_Promote {
  return { schema_version: WORKER_PROTOCOL_VERSION, type: "promote", wikiUri, coreBlob, coreHash, docUrl, syncPort };
}

export function mkPromoteAck(wikiUri: string): WorkerMsg_PromoteAck {
  return { schema_version: WORKER_PROTOCOL_VERSION, type: "promote:ack", wikiUri };
}

/**
 * @deprecated GP-3 oracle path. In Repo-in-Worker path the Worker generates frame ACKs itself.
 */
export function mkChangeset(
  wikiUri: string,
  added:   readonly Record<string, unknown>[],
  deleted: readonly string[],
  batch_id: string = crypto.randomUUID(),
): WorkerMsg_Changeset {
  return { schema_version: WORKER_PROTOCOL_VERSION, type: "changeset", wikiUri, batch_id, added, deleted };
}

export function mkChangesetAck(wikiUri: string, batch_id: string): WorkerMsg_ChangesetAck {
  return { schema_version: WORKER_PROTOCOL_VERSION, type: "changeset:ack", wikiUri, batch_id };
}

export function mkFault(wikiUri: string, error: string): WorkerMsg_Fault {
  return { schema_version: WORKER_PROTOCOL_VERSION, type: "fault", wikiUri, error };
}

// ── Tiddler delta extraction — Worker-side utility ─────────────────────────

/**
 * Extract a tiddler add/delete delta from an Automerge doc + patch list.
 *
 * Used by Worker entry files to derive TW5 mutations from Worker-side Repo change events.
 * Replaces the GP-3 oracle pattern (main-thread `_subscribeDocChanges` ETL).
 *
 * `patches` is `Patch[]` from `@automerge/automerge` — each patch identifies a mutated path.
 * `doc` is the post-change `LarDoc` snapshot (already reconciled).
 *
 * Walks `tiddlers.*` patches only; ignores `blobs`, `schemaVersion`, and other top-level keys.
 */
export function extractTiddlerDeltaFromPatches(
  doc:     Record<string, unknown>,
  patches: ReadonlyArray<{ path: ReadonlyArray<string | number> }>,
): { added: Record<string, unknown>[]; deleted: string[] } {
  const changedUris = new Set<string>();
  for (const patch of patches) {
    if (patch.path.length >= 2 && patch.path[0] === "tiddlers") {
      changedUris.add(String(patch.path[1]));
    }
  }

  const tiddlers = (doc["tiddlers"] ?? {}) as Record<string, unknown>;
  const added:   Record<string, unknown>[] = [];
  const deleted: string[]                  = [];

  for (const uri of changedUris) {
    const rec = tiddlers[uri] as (Record<string, unknown> & { deleted?: boolean }) | undefined;
    if (!rec || rec["deleted"]) {
      deleted.push(uri);
    } else {
      const tiddlerRec = rec["tiddler"] as Record<string, unknown> | undefined;
      const fields = tiddlerRec ? { title: uri, ...tiddlerRec } : { title: uri };
      added.push(fields);
    }
  }

  return { added, deleted };
}

/**
 * Materialize all tiddlers from a LarDoc snapshot (for initial TW5 load after Repo sync).
 */
export function allTiddlersFromDoc(
  doc: Record<string, unknown>,
): Record<string, unknown>[] {
  const tiddlers = (doc["tiddlers"] ?? {}) as Record<string, unknown>;
  const result: Record<string, unknown>[] = [];
  for (const [uri, rec] of Object.entries(tiddlers)) {
    const r = rec as Record<string, unknown> & { deleted?: boolean };
    if (r["deleted"]) continue;
    const tiddlerRec = r["tiddler"] as Record<string, unknown> | undefined;
    result.push(tiddlerRec ? { title: uri, ...tiddlerRec } : { title: uri });
  }
  return result;
}

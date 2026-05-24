/**
 * worker-protocol — GP-1 schema: discriminated union for all main ↔ wiki-Worker messages.
 *
 * Every message crossing the main-thread / wiki-Worker boundary MUST use this envelope.
 * Implements GP-1 through GP-4 from the structured-clone-gap contract.
 *
 * GP-1: schema_version on every message. Lock at 1; increment on breaking changes.
 * GP-2: all payloads are plain objects; no class instances, no functions, no DOM.
 * GP-3: Tiddler-level delta (added / deleted arrays). Main thread derives the delta
 *       from Automerge patches — the Worker never loads the WASM runtime.
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
 * Deliver a tiddler-level delta to the wiki Worker.
 *
 * GP-3: main thread computes this from Automerge `change` event patches —
 * the Worker never loads the Automerge WASM runtime.
 *
 * ACK-gate: every changeset carries a `batch_id`. The Worker MUST reply with
 * `changeset:ack` before the main thread sends the next batch. This gives the
 * Worker backpressure authority — it controls the flow rate, not the producer.
 */
export interface WorkerMsg_Changeset {
  schema_version: ProtocolVersion;
  type: "changeset";
  wikiUri: string;
  /** Opaque identifier echoed back in changeset:ack. Caller uses crypto.randomUUID(). */
  batch_id: string;
  added:   readonly Record<string, unknown>[];
  deleted: readonly string[];
}

/**
 * Promote the wiki slot from cold to hot (boot TW5).
 *
 * GP-2: snapshotTiddlers MUST be a plain-object array — no class instances.
 * BA-5: coreBlob travels as Uint8Array; the Worker runtime transfers ownership.
 *       TW5 boot accepts Uint8Array directly via TW5CoreBootInput.
 */
export interface WorkerMsg_Promote {
  schema_version: ProtocolVersion;
  type: "promote";
  wikiUri: string;
  snapshotTiddlers: readonly Record<string, unknown>[] | null;
  /** Serialized TW5 core. Transferred, not cloned. */
  coreBlob: Uint8Array;
}

/** Demote the wiki slot from hot to cold (teardown; thread may terminate). */
export interface WorkerMsg_Demote {
  schema_version: ProtocolVersion;
  type: "demote";
  wikiUri: string;
}

/**
 * Begin the GP-5 teardown handshake.
 * Worker MUST complete in-flight reactions, cancel all live handles, then
 * respond with teardown:ack before main calls worker.terminate().
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
 *
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
  snapshotTiddlers?: readonly Record<string, unknown>[];
}

/** Acknowledgement of successful hot-tier boot (TW5 live and ready). */
export interface WorkerMsg_PromoteAck {
  schema_version: ProtocolVersion;
  type: "promote:ack";
  wikiUri: string;
}

/**
 * Worker-side fault signal. Main MUST mark the slot as evicted and
 * NOT route further messages to this Worker.
 */
export interface WorkerMsg_Fault {
  schema_version: ProtocolVersion;
  type: "fault";
  wikiUri: string;
  error: string;
}

/**
 * ACK-gate reply to WorkerMsg_Changeset.
 *
 * The Worker emits this after applying the tiddler delta. The main thread
 * MUST NOT send the next changeset batch until this arrives. The Worker
 * owns the flow rate — this is the backpressure inversion point.
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

export function mkTeardownAck(
  snapshotTiddlers?: readonly Record<string, unknown>[],
): WorkerMsg_TeardownAck {
  const msg: WorkerMsg_TeardownAck = { schema_version: WORKER_PROTOCOL_VERSION, type: "teardown:ack" };
  if (snapshotTiddlers !== undefined) msg.snapshotTiddlers = snapshotTiddlers;
  return msg;
}

/** coreBlob travels as raw bytes (BA-5 transfer semantics). */
export function mkPromote(
  wikiUri: string,
  coreBlob: Uint8Array,
  snapshotTiddlers: readonly Record<string, unknown>[] | null = null,
): WorkerMsg_Promote {
  return { schema_version: WORKER_PROTOCOL_VERSION, type: "promote", wikiUri, coreBlob, snapshotTiddlers };
}

export function mkPromoteAck(wikiUri: string): WorkerMsg_PromoteAck {
  return { schema_version: WORKER_PROTOCOL_VERSION, type: "promote:ack", wikiUri };
}

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

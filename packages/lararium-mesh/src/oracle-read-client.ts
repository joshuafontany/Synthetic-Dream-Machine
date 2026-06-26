/**
 * oracle-read-client — the CONSUMER side of the Two-Faced Substrate: pull a peer's
 * @oracle read-face over the wire, run the reader rule, and load it as a CRDT.
 *
 * This is the second-spore primitive — the first cross-vessel contact the read-only
 * substrate enables. A reader (any vessel, anon) fetches a peer node's pointer +
 * content-addressed snapshot, VERIFIES before trusting (signature · anti-rollback ·
 * anti-equivocation · local-clock freshness · rehash == cid), and only then loads.
 * Isomorphic: global `fetch` (Node 18+/browser) + `Automerge.load`; a browser vessel
 * reads exactly this way.
 *
 * Canon: lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity#the-oracle-plane
 */

import { load as automergeLoad, type Doc } from "@automerge/automerge";
import { verifyOraclePointer, verifyOracleSnapshotBytes, type OraclePointer } from "./oracle-substrate.js";

export interface OraclePullResult<T = unknown> {
  readonly ok:       boolean;
  readonly reason?:  string;
  readonly pointer?: OraclePointer;
  readonly doc?:     Doc<T>;
  readonly cid?:     string;
}

export interface OraclePullOpts {
  /** Pin the publisher — refuse a pointer signed by any other key. */
  readonly verifyingKey?:     string;
  /** The reader's remembered high-water version — a lower one reads as a rollback. */
  readonly highWaterVersion?: number;
  /** The id of the last pointer this reader held — a `prev` that doesn't link it is a fork. */
  readonly lastPointerId?:    string;
  /** The reader's local clock (default `Date.now()`). */
  readonly nowMs?:            number;
  /** Injectable fetch (for tests). */
  readonly fetchImpl?:        typeof fetch;
}

/**
 * Pull + verify + load @oracle from a peer's read-face at `baseUrl`. Never throws;
 * a failure returns `{ ok: false, reason }` (and the pointer, when it got that far).
 * Order: fetch pointer → verify → fetch snapshot by cid → rehash → load.
 */
export async function pullAndVerifyOracle<T = unknown>(
  baseUrl: string,
  opts: OraclePullOpts = {},
): Promise<OraclePullResult<T>> {
  const f     = opts.fetchImpl ?? fetch;
  const nowMs = opts.nowMs ?? Date.now();
  const base  = baseUrl.replace(/\/+$/, "");

  // 1. the signed pointer.
  let pointer: OraclePointer;
  try {
    const r = await f(`${base}/oracle/pointer`);
    if (!r.ok) return { ok: false, reason: `pointer fetch HTTP ${r.status}` };
    pointer = (await r.json()) as OraclePointer;
  } catch (e) {
    return { ok: false, reason: `pointer fetch failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  // 2. the reader rule — verify BEFORE trusting.
  const verdict = await verifyOraclePointer(pointer, {
    nowMs,
    ...(opts.verifyingKey     !== undefined ? { verifyingKey:     opts.verifyingKey }     : {}),
    ...(opts.highWaterVersion !== undefined ? { highWaterVersion: opts.highWaterVersion } : {}),
    ...(opts.lastPointerId    !== undefined ? { lastPointerId:    opts.lastPointerId }    : {}),
  });
  if (!verdict.ok) return { ok: false, reason: `pointer rejected: ${verdict.reason}`, pointer };

  // 3. the content-addressed snapshot.
  let bytes: Uint8Array;
  try {
    const r = await f(`${base}/oracle/${pointer.cid}.bin`);
    if (!r.ok) return { ok: false, reason: `snapshot fetch HTTP ${r.status}`, pointer };
    bytes = new Uint8Array(await r.arrayBuffer());
  } catch (e) {
    return { ok: false, reason: `snapshot fetch failed: ${e instanceof Error ? e.message : String(e)}`, pointer };
  }

  // 4. the content-address must hold — rehash == cid (the host cannot lie about the bytes).
  if (!(await verifyOracleSnapshotBytes(bytes, pointer.cid)))
    return { ok: false, reason: "snapshot hash mismatch (cid does not match bytes)", pointer };

  // 5. load read-only.
  let doc: Doc<T>;
  try {
    doc = automergeLoad<T>(bytes);
  } catch (e) {
    return { ok: false, reason: `automerge load failed: ${e instanceof Error ? e.message : String(e)}`, pointer };
  }

  return { ok: true, pointer, doc, cid: pointer.cid };
}

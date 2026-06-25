/**
 * oracle-read-face — the node-side wiring of the Two-Faced Substrate.
 *
 * Serves @oracle as the READ-ONLY PUBLIC substrate over the node's existing HTTP
 * server (no new tech, no new port):
 *   GET /oracle/pointer      → the current signed monotone pointer (JSON)
 *   GET /oracle/<cid>.bin    → the content-addressed snapshot bytes (Automerge.save)
 *
 * Write-refusal is by construction: only GET is served, the bytes are named by their
 * own hash, and there is no sync session — nothing to write. On each @oracle change
 * the face re-exports the snapshot and ratchets a fresh pointer (version++, prev-linked,
 * signed). The monotone counter persists to disk so it never regresses across a reboot
 * (a reset counter would read as a ROLLBACK to every reader).
 *
 * Canon: lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity#the-oracle-plane
 * (the content-addressed floor; Hypercore live-streaming rides above it as the
 * deferred end-goal). The pure core (export/build/verify) lives in @lararium/mesh.
 */

import type { Server, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { DocHandle } from "@automerge/automerge-repo";
import {
  exportOracleSnapshot, buildOraclePointer, oraclePointerId,
  type OracleSnapshot, type OraclePointer,
} from "@lararium/mesh";

/** Freshness lease re-issued on every change (read against the reader's LOCAL clock). */
const POINTER_TTL_MS = 5 * 60_000;
/** Persists {version, lastPointerId} so the monotone counter survives a reboot. */
const STATE_FILE = "oracle-pointer-state.json";

interface PersistedPointerState {
  readonly version:       number;
  readonly lastPointerId: string | null;
}

export interface OracleReadFace {
  /** Tear down the change-subscription + the HTTP request handler. */
  readonly dispose: () => void;
}

/**
 * Mount the read-face on a running HTTP server, exporting from the @oracle handle and
 * signing pointers with the node's seed. Idempotent in effect — re-exports only when
 * the @oracle content hash actually changes.
 */
export async function mountOracleReadFace(args: {
  readonly httpServer:   Server;
  readonly oracleHandle: DocHandle<unknown>;
  readonly signerSeed:   Uint8Array;
  readonly storageDir:   string;
  readonly onLog?:       (line: string) => void;
}): Promise<OracleReadFace> {
  const { httpServer, oracleHandle, signerSeed, storageDir, onLog } = args;
  const statePath = join(storageDir, STATE_FILE);

  let snapshot: OracleSnapshot | null = null;
  let pointer:  OraclePointer  | null = null;

  // Load the persisted monotone counter — a fresh-from-1 counter after a reboot would
  // read as a rollback to every peer that already saw a higher version.
  let persisted: PersistedPointerState = { version: 0, lastPointerId: null };
  try {
    const raw = JSON.parse(readFileSync(statePath, "utf8")) as PersistedPointerState;
    if (Number.isInteger(raw.version) && raw.version >= 0) persisted = raw;
  } catch { /* first boot — start at 0 */ }

  async function refresh(): Promise<void> {
    const doc = oracleHandle.doc();
    if (!doc) return;
    const snap = await exportOracleSnapshot(doc);
    if (snapshot && snap.cid === snapshot.cid) return; // unchanged → no new pointer
    const version = persisted.version + 1;
    const expiry  = Date.now() + POINTER_TTL_MS;
    const ptr = await buildOraclePointer({
      snapshot: snap, version, prev: persisted.lastPointerId, expiry, signerSeed,
    });
    const id = await oraclePointerId(ptr);
    snapshot = snap;
    pointer  = ptr;
    persisted = { version, lastPointerId: id };
    try {
      mkdirSync(storageDir, { recursive: true });
      writeFileSync(statePath, JSON.stringify(persisted));
    } catch { /* quota — the in-memory pointer still serves this run */ }
    onLog?.(`@oracle read-face: v${version} cid=${snap.cid.slice(0, 12)}… (${snap.bytes.byteLength}B)`);
  }

  await oracleHandle.whenReady();
  await refresh();
  const onChange = (): void => { void refresh(); };
  oracleHandle.on("change", onChange);

  const onRequest = (req: IncomingMessage, res: ServerResponse): void => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (!pathname.startsWith("/oracle/")) return; // not ours — leave for other handlers
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "text/plain" });
      res.end("method not allowed");
      return;
    }
    if (pathname === "/oracle/pointer") {
      if (!pointer) { res.writeHead(503); res.end("no pointer yet"); return; }
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(pointer));
      return;
    }
    const m = pathname.match(/^\/oracle\/([0-9a-f]{64})\.bin$/);
    if (m && snapshot && m[1] === snapshot.cid) {
      res.writeHead(200, {
        "content-type":  "application/octet-stream",
        "cache-control": "public, immutable, max-age=31536000", // content-addressed → never stale
      });
      res.end(Buffer.from(snapshot.bytes));
      return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("unknown or stale oracle cid");
  };
  httpServer.on("request", onRequest);

  return {
    dispose: () => {
      oracleHandle.off("change", onChange);
      httpServer.off("request", onRequest);
    },
  };
}

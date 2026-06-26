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
  readonly lastPointerId: string | null;  // id of the current version's pointer (lineage anchor)
  readonly prevId:        string | null;  // its prev — kept so a heartbeat re-signs the same identity
  readonly cid:           string | null;  // the last published content hash (detect a real change vs a reboot)
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
  let persisted: PersistedPointerState = { version: 0, lastPointerId: null, prevId: null, cid: null };
  try {
    const raw = JSON.parse(readFileSync(statePath, "utf8")) as PersistedPointerState;
    if (Number.isInteger(raw.version) && raw.version >= 0) persisted = raw;
  } catch { /* first boot — start at 0 */ }

  // Re-publish the pointer. A CONTENT change bumps the monotone version + advances the
  // lineage; an EA (the breath — force, no content change) renews the freshness lease on
  // the SAME version+prev — the pointer is a LEASE, so a static @oracle must keep being
  // fed or readers reject it stale (the gap the first live cross-vessel read surfaced).
  async function reissue(force: boolean): Promise<void> {
    const doc = oracleHandle.doc();
    if (!doc) return;
    const snap = await exportOracleSnapshot(doc);
    const changed = snap.cid !== persisted.cid;
    if (!changed && !force) return;
    const version = changed ? persisted.version + 1 : persisted.version;
    const prev    = changed ? persisted.lastPointerId : persisted.prevId;
    const expiry  = Date.now() + POINTER_TTL_MS;
    const ptr = await buildOraclePointer({ snapshot: snap, version, prev, expiry, signerSeed });
    snapshot = snap;
    pointer  = ptr;
    if (changed) {
      const id = await oraclePointerId(ptr);
      persisted = { version, lastPointerId: id, prevId: prev, cid: snap.cid };
      try {
        mkdirSync(storageDir, { recursive: true });
        writeFileSync(statePath, JSON.stringify(persisted));
      } catch { /* quota — the in-memory pointer still serves this run */ }
      onLog?.(`@oracle read-face: v${version} cid=${snap.cid.slice(0, 12)}… (${snap.bytes.byteLength}B)`);
    }
  }

  await oracleHandle.whenReady();
  await reissue(true);
  const onChange = (): void => { void reissue(false); };
  oracleHandle.on("change", onChange);
  // Ea — the breath that renews the lease before it lapses, even with no content change
  // (feed-the-Lar: a static @oracle still breathes, so its pointer never reads stale).
  const ea = setInterval(() => { void reissue(true); }, Math.floor(POINTER_TTL_MS / 2));
  ea.unref();

  // The read-face is the PUBLIC read-only plane — it reads to ANY origin (a node-less
  // browser vessel on elyncia.app / localhost dev reads cross-origin). Open CORS is
  // correct + pono here: no credentials, no writes, content verified by hash + signature.
  const CORS: Record<string, string> = {
    "access-control-allow-origin":  "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "*",
  };
  const onRequest = (req: IncomingMessage, res: ServerResponse): void => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (!pathname.startsWith("/oracle/")) return; // not ours — leave for other handlers
    if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; } // preflight
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { ...CORS, "content-type": "text/plain" });
      res.end("method not allowed");
      return;
    }
    if (pathname === "/oracle/pointer") {
      if (!pointer) { res.writeHead(503, CORS); res.end("no pointer yet"); return; }
      res.writeHead(200, { ...CORS, "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(pointer));
      return;
    }
    const m = pathname.match(/^\/oracle\/([0-9a-f]{64})\.bin$/);
    if (m && snapshot && m[1] === snapshot.cid) {
      res.writeHead(200, {
        ...CORS,
        "content-type":  "application/octet-stream",
        "cache-control": "public, immutable, max-age=31536000", // content-addressed → never stale
      });
      res.end(Buffer.from(snapshot.bytes));
      return;
    }
    res.writeHead(404, { ...CORS, "content-type": "text/plain" });
    res.end("unknown or stale oracle cid");
  };
  httpServer.on("request", onRequest);

  return {
    dispose: () => {
      clearInterval(ea);
      oracleHandle.off("change", onChange);
      httpServer.off("request", onRequest);
    },
  };
}

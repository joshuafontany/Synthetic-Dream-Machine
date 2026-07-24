/**
 * bulb-read-face — serve the HELD bulb by CID over the node's PUBLIC read-face (the oracle-substrate floor).
 *
 * Routes (GET-only, on the SAME HTTP server the FLOW-map read-face uses, under a distinct `/bulb/` prefix):
 *   GET /bulb/manifest    → the bulb manifest (cid index, JSON)
 *   GET /bulb/pointer     → a signed monotone pointer over the manifest cid (corm-lease freshness / anti-rollback)
 *   GET /bulb/<cid>.bin   → a content-addressed bulb blob (seed · bootstrap · cas-manifest · each engine/plugin blob)
 *
 * PUBLIC-FLOOR ONLY. The bulb carries ALL-PUBLIC boot material, so it rides THIS floor exclusively — NEVER the @cad
 * carriage (Socket B). Write-refusal holds by construction: only GET, bytes named by their own hash, no sync session.
 * The signed pointer is the corm-lease: served FROZEN offline (the static blob), the pointer's freshness lease
 * re-issues on the Ea breath so a live Herm advances it online (anti-rollback = the oracle-substrate max-register).
 *
 * SERVE FIRE, NEVER KEY. The bulb carries no signing key; the pointer's signer is the Herm's OWN publish key (it
 * signs WHERE-the-current-bulb-is, never the kindled hearth's identity — that key is minted on the cold device).
 *
 * Meme: lar:///ha.ka.ba/lararium/node/bulb-read-face
 */

import type { Server, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildOraclePointer, oraclePointerId, sha256HexBytesSync, utf8Bytes, type OraclePointer } from "@lararium/mesh";
import { atomicWriteFileSync } from "./fs-atomic.js";
import { buildBulb, type BulbArtifact, type BulbBlob, type BulbManifest } from "./bulb.js";
import type { OracleReadFace } from "./oracle-read-face.js";

/** The bulb pointer freshness lease (read against the puller's LOCAL clock). */
const BULB_POINTER_TTL_MS = 5 * 60_000;
/** Persists the monotone pointer version so it never regresses across a reboot (a reset would read as rollback). */
const BULB_STATE_FILE = "bulb-pointer-state.json";

interface PersistedBulbPointerState {
  readonly version:       number;
  readonly lastPointerId: string | null;
  readonly prevId:        string | null;
  readonly cid:           string | null;   // the last published manifest cid (a real bulb change vs a reboot)
}

/**
 * Mount the bulb read-face. Content-addresses the bulb ONCE (the held snapshot is immutable), signs a monotone
 * pointer over the manifest cid, and re-issues the freshness lease on the Ea breath. Returns a disposable face.
 */
export async function mountBulbReadFace(args: {
  readonly httpServer: Server;
  readonly bulb:       BulbArtifact;
  readonly signerSeed: Uint8Array;
  readonly storageDir: string;
  readonly onLog?:     (line: string) => void;
}): Promise<OracleReadFace> {
  const { httpServer, bulb, signerSeed, storageDir, onLog } = args;
  const { manifest, blobs } = buildBulb(bulb);
  const manifestBytes = utf8Bytes(JSON.stringify(manifest));
  const manifestCid   = sha256HexBytesSync(manifestBytes);
  const blobByCid = new Map<string, Uint8Array>(blobs.map((b: BulbBlob) => [b.cid, b.bytes]));

  const statePath = join(storageDir, BULB_STATE_FILE);
  let persisted: PersistedBulbPointerState = { version: 0, lastPointerId: null, prevId: null, cid: null };
  try {
    const raw = JSON.parse(readFileSync(statePath, "utf8")) as PersistedBulbPointerState;
    if (Number.isInteger(raw.version) && raw.version >= 0) persisted = raw;
  } catch { /* first boot — start at 0 */ }

  let pointer: OraclePointer | null = null;

  // Re-publish the pointer. A manifest-cid CHANGE (a re-baked bulb) bumps the version + advances the lineage; an Ea
  // breath (no change) renews the freshness lease on the SAME version — the pointer is a LEASE, so a static bulb
  // must keep breathing or a puller rejects it stale (the corm-lease: frozen offline, advanced online).
  async function reissue(): Promise<void> {
    const changed = manifestCid !== persisted.cid;
    const version = changed ? persisted.version + 1 : persisted.version;
    const prev    = changed ? persisted.lastPointerId : persisted.prevId;
    const expiry  = Date.now() + BULB_POINTER_TTL_MS;
    // The pointer's snapshot names the manifest cid + heads = [] (the bulb is a flat content-address, no CRDT heads).
    const ptr = await buildOraclePointer({ snapshot: { cid: manifestCid, heads: [], bytes: manifestBytes }, version, prev, expiry, signerSeed });
    pointer = ptr;
    if (changed) {
      const id = await oraclePointerId(ptr);
      persisted = { version, lastPointerId: id, prevId: prev, cid: manifestCid };
      try { mkdirSync(storageDir, { recursive: true }); atomicWriteFileSync(statePath, JSON.stringify(persisted)); }
      catch { /* quota — the in-memory pointer still serves this run */ }
      onLog?.(`bulb read-face: v${version} manifest=${manifestCid.slice(0, 12)}… blobs=${blobs.length}`);
    }
  }
  await reissue();
  const ea = setInterval(() => { void reissue(); }, Math.floor(BULB_POINTER_TTL_MS / 2));
  ea.unref();

  const CORS: Record<string, string> = {
    "access-control-allow-origin":  "*",
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    "access-control-allow-headers": "*",
  };
  const onRequest = (req: IncomingMessage, res: ServerResponse): void => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (!pathname.startsWith("/bulb/")) return;   // not ours — leave for other handlers
    if (req.method === "OPTIONS") { res.writeHead(204, CORS); res.end(); return; }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { ...CORS, "content-type": "text/plain" }); res.end("method not allowed"); return;
    }
    if (pathname === "/bulb/manifest") {
      res.writeHead(200, { ...CORS, "content-type": "application/json", "cache-control": "no-store" });
      res.end(Buffer.from(manifestBytes)); return;
    }
    if (pathname === "/bulb/pointer") {
      if (!pointer) { res.writeHead(503, CORS); res.end("no pointer yet"); return; }
      res.writeHead(200, { ...CORS, "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(pointer)); return;
    }
    const m = pathname.match(/^\/bulb\/([0-9a-f]{64})\.bin$/);
    const bytes = m ? blobByCid.get(m[1]!) : undefined;
    if (bytes) {
      res.writeHead(200, { ...CORS, "content-type": "application/octet-stream", "cache-control": "public, immutable, max-age=31536000" });
      res.end(Buffer.from(bytes)); return;
    }
    res.writeHead(404, { ...CORS, "content-type": "text/plain" }); res.end("unknown or stale bulb cid");
  };
  httpServer.on("request", onRequest);

  return { dispose: () => { clearInterval(ea); httpServer.off("request", onRequest); } };
}

/** The bulb manifest a puller GETs first (re-exported so the kindle transport speaks the same type). */
export type { BulbManifest };

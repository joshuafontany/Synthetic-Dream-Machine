/**
 * bulb — the corm-and-rhizome BULB cap: a HELD cold-boot snapshot that carries its own next generation.
 *
 * The bulb = "seed-inside" (vessel-caps): the whole ALL-PUBLIC boot material a stranger needs to kindle their OWN
 * sovereign hearth — the genesis @oracle seed, the engine + plugin CAS bytes, the social bootstrap pointers, PINNED
 * to a charter chain-head epoch. A Herm HOLDS it and serves it FROZEN offline / self-refreshed online (the oracle-
 * substrate corm-lease). It hands the FIRE (engine + genesis + grammar) — NEVER a key: the kindled hearth mints its
 * own sovereign self-certifying key from first breath (`kindleFromBulb`), so carry ⊥ read holds (the bulb carries
 * public boot material; the new hearth's keys never touch the Herm).
 *
 * ALL-PUBLIC → the PUBLIC FLOOR ONLY. The bulb rides the read-face (oracle-substrate) EXCLUSIVELY — NEVER the @cad
 * carriage (Socket B). Routing a public artifact through the seal/keyring lane would collapse the OPEN path into
 * CLOSED (crypto-spine ledger #1: the @cad seal ⊥ the ECDH box). Bulb ⊥ stolon: the bulb is the OPEN path (a stranger
 * births their own sovereign hearth); the stolon is the CLOSED path (invite a device into YOUR fleet).
 *
 * CONTENT-ADDRESSED. Every piece (seed, bootstrap, cas-manifest, each engine/plugin blob) is named by its own
 * sha256; the manifest lists the cids. A puller re-verifies `sha256(bytes) == cid` on every blob BEFORE it trusts
 * a byte — the serve stays a HINT-free content-address, no signer needed for integrity (the pointer adds freshness).
 *
 * Meme: lar:///ha.ka.ba/lararium/node/bulb
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sha256HexBytesSync, utf8Bytes, type GenesisSeed, type GenesisCasManifest } from "@lararium/mesh";
import { readGenesisSeed, readGenesisManifest, genesisCasDir } from "./genesis-artifact.js";
import { readCasBlobFromFs } from "./node-cas.js";

/** The bulb-manifest format tag — a puller refuses an unknown one (fail-closed). */
export const BULB_MANIFEST_FORMAT = "lararium-bulb-manifest/v1" as const;

/** The held cold-boot snapshot — genesis seed + CAS + bootstrap, PINNED to a charter chain-head epoch. NO KEY. */
export interface BulbArtifact {
  /** The plain-data @oracle genesis seed — the boot MATERIALIZES the @oracle CRDT fresh from it. */
  readonly seed:            GenesisSeed;
  /** The genesis CAS manifest — which engine/plugin blobs the seed references. */
  readonly casManifest:     GenesisCasManifest;
  /** Every CAS-bound blob's {cid, bytes} (engine + plugins) — the FIRE bytes a fresh hearth boots on. */
  readonly casEntries:      readonly { readonly cid: string; readonly bytes: Uint8Array }[];
  /** The ALL-PUBLIC social bootstrap pointers (identities/circles/sessions/daemon/persona doc urls). */
  readonly bootstrap:       Record<string, unknown>;
  /** The charter chain-head epoch this bulb is EPOCH-PINNED to (null when the charter is unseated). */
  readonly charterEpochCid: string | null;
}

/** One content-addressed bulb blob served by cid over the public floor. */
export interface BulbBlob { readonly cid: string; readonly bytes: Uint8Array; }

/** The bulb manifest — the cid index a puller fetches first, then re-verifies every named blob against. */
export interface BulbManifest {
  readonly format:          typeof BULB_MANIFEST_FORMAT;
  readonly seedCid:         string;              // sha256(JSON(seed))
  readonly bootstrapCid:    string;              // sha256(JSON(bootstrap))
  readonly casManifestCid:  string;              // sha256(JSON(casManifest))
  readonly casCids:         readonly string[];   // the engine + plugin CAS blob cids (each = its own sha256)
  readonly charterEpochCid: string | null;       // the epoch-PIN (charter chain-head)
}

const jsonBytes = (v: unknown): Uint8Array => utf8Bytes(JSON.stringify(v));

/**
 * Content-address a bulb into a manifest + the flat blob set the read-face serves by cid. The seed, bootstrap, and
 * cas-manifest each get a sha256 cid; the CAS entries carry their own (they are already sha256-named). NO signer,
 * NO key — a bulb is public boot material; integrity rides the content-address, freshness rides the pointer above.
 */
export function buildBulb(a: BulbArtifact): { manifest: BulbManifest; blobs: BulbBlob[] } {
  const seedBytes        = jsonBytes(a.seed);
  const bootstrapBytes   = jsonBytes(a.bootstrap);
  const casManifestBytes = jsonBytes(a.casManifest);
  const seedCid          = sha256HexBytesSync(seedBytes);
  const bootstrapCid     = sha256HexBytesSync(bootstrapBytes);
  const casManifestCid   = sha256HexBytesSync(casManifestBytes);
  const manifest: BulbManifest = {
    format: BULB_MANIFEST_FORMAT,
    seedCid, bootstrapCid, casManifestCid,
    casCids: a.casEntries.map((e) => e.cid),
    charterEpochCid: a.charterEpochCid,
  };
  const blobs: BulbBlob[] = [
    { cid: seedCid,        bytes: seedBytes },
    { cid: bootstrapCid,   bytes: bootstrapBytes },
    { cid: casManifestCid, bytes: casManifestBytes },
    ...a.casEntries.map((e) => ({ cid: e.cid, bytes: e.bytes })),
  ];
  return { manifest, blobs };
}

/**
 * Re-assemble a bulb from a manifest + a blob fetcher, re-verifying `sha256(bytes) == cid` on EVERY blob before it
 * trusts a byte (a tampered/absent blob throws, never a partial bulb). The one intake a puller runs — content-
 * address integrity, secret-free. The manifest format is checked first (fail-closed on an unknown one).
 */
export function assembleBulb(manifest: BulbManifest, getBlob: (cid: string) => Uint8Array | null): BulbArtifact {
  if (manifest.format !== BULB_MANIFEST_FORMAT) {
    throw new Error(`[bulb] unknown manifest format ${String(manifest.format)} — refusing`);
  }
  const verified = (cid: string, label: string): Uint8Array => {
    const bytes = getBlob(cid);
    if (!bytes) throw new Error(`[bulb] ${label} blob absent (cid ${cid})`);
    if (sha256HexBytesSync(bytes) !== cid) throw new Error(`[bulb] ${label} blob fails content-address (cid ${cid})`);
    return bytes;
  };
  const seed        = JSON.parse(new TextDecoder().decode(verified(manifest.seedCid,        "seed")))        as GenesisSeed;
  const bootstrap   = JSON.parse(new TextDecoder().decode(verified(manifest.bootstrapCid,   "bootstrap")))   as Record<string, unknown>;
  const casManifest = JSON.parse(new TextDecoder().decode(verified(manifest.casManifestCid, "cas-manifest"))) as GenesisCasManifest;
  const casEntries  = manifest.casCids.map((cid) => ({ cid, bytes: verified(cid, "cas") }));
  return { seed, casManifest, casEntries, bootstrap, charterEpochCid: manifest.charterEpochCid };
}

/**
 * Read a bulb off a genesis dir — the HELD snapshot a Herm serves. Reads the plain-data seed (island.genesis.json),
 * the CAS manifest (island.manifest.json), every genesis/cas/<cid> blob, and the social bootstrap (social-bootstrap.json),
 * PINNED to the passed charter chain-head epoch. Returns null when the genesis is absent/malformed (nothing to serve).
 */
export function readBulbArtifact(genesisDir: string, charterEpochCid: string | null): BulbArtifact | null {
  const seed        = readGenesisSeed(genesisDir);
  const casManifest = readGenesisManifest(genesisDir);
  if (!seed || !casManifest) return null;
  const casDir = genesisCasDir(genesisDir);
  const casEntries = casManifest.blobs.map((b) => {
    const bytes = readCasBlobFromFs(b.cid, casDir);
    if (!bytes) throw new Error(`[bulb] genesis CAS blob absent for cid ${b.cid} — re-run build:genesis`);
    return { cid: b.cid, bytes };
  });
  let bootstrap: Record<string, unknown> = {};
  try { bootstrap = JSON.parse(readFileSync(join(genesisDir, "social-bootstrap.json"), "utf8")) as Record<string, unknown>; }
  catch { bootstrap = {}; }   // a Herm with no seated social plane serves an empty bootstrap (a stranger seeds their own)
  return { seed, casManifest, casEntries, bootstrap, charterEpochCid };
}

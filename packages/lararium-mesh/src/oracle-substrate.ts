/**
 * oracle-substrate — the read-only PUBLIC substrate: a content-addressed snapshot
 * (the floor) + a signed monotone lineage-linked pointer (the ratchet face).
 *
 * Canon: lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity#the-oracle-plane
 * (the Two-Faced Substrate, swarm-ruled 2026-06-25). The read face serves @oracle as
 * an IMMUTABLE blob — `Automerge.save(doc)` bytes named by their content hash — so
 * write-refusal needs no check: a hash-named blob holds no mutable surface, no sync
 * session, no inbound frame to refuse. The thin signed pointer carries currency:
 * a reader rejects any version below its high-water (anti-rollback = the epoch-lease /
 * max-register), checks `prev` links the last head (anti-equivocation = causal
 * ancestry, gossiped), and trusts its LOCAL clock for `expiry` (no global now).
 * Real-time streaming (Hypercore, read-only by keypair) rides ABOVE this floor as the
 * named end-goal — deferred.
 *
 * This module is the PURE core (isomorphic, no I/O): export a snapshot, build/sign a
 * pointer, and run the reader rule. Hardened like device-delegation — it NEVER throws
 * on untrusted input; `verifyOraclePointer` returns a verdict, never an exception.
 * Wiring (serve the blob over the node's HTTP server, publish the pointer on the
 * existing channel) rides a separate, node-side module.
 */

import * as ed25519 from "@noble/ed25519";
import { save, getHeads, type Doc } from "@automerge/automerge";
import { hex, hexToBytes, sha256Hex, utf8Bytes, defaultCryptoProvider, type DigestProvider } from "./crypto.js";

export const ORACLE_POINTER_DOMAIN = "lar-oracle-pointer/v1" as const;

const HEX64_RE = /^[0-9a-f]{64}$/;   // sha256 hex / ed25519 verifying-key hex / automerge head
const SIG_RE   = /^[0-9a-f]{128}$/;  // 64-byte ed25519 signature hex

/** A point-in-time export of the @oracle doc — the immutable read-face artifact. */
export interface OracleSnapshot {
  /** sha256(bytes) hex — THE content address; the reader rehashes to verify. */
  readonly cid:   string;
  /** Automerge heads of the doc at export — the logical version id. */
  readonly heads: readonly string[];
  /** `Automerge.save(doc)` output — the whole doc, history included. */
  readonly bytes: Uint8Array;
}

/** The signed, monotone, lineage-linked pointer to the current snapshot. */
export interface OraclePointer {
  readonly cid:     string;             // content address of the current snapshot
  readonly heads:   readonly string[];  // its automerge heads
  readonly version: number;             // monotone counter (anti-rollback)
  readonly prev:    string | null;      // id of the previous pointer (lineage), or null at genesis
  readonly expiry:  number;             // ms epoch; freshness lease read against the LOCAL clock
  readonly pub:     string;             // signer verifying-key hex (self-describing)
  readonly sig:     string;             // ed25519 sig over the canonical signing string
}

/** Export the @oracle doc as a content-addressed snapshot (the read-face artifact). */
export async function exportOracleSnapshot<T>(
  doc: Doc<T>,
  provider: DigestProvider = defaultCryptoProvider,
): Promise<OracleSnapshot> {
  const bytes = save(doc);
  const cid   = await sha256Hex(bytes, provider);
  const heads = getHeads(doc) as string[];
  return { cid, heads, bytes };
}

/** A downloaded blob is the named snapshot iff its hash matches the cid. */
export async function verifyOracleSnapshotBytes(
  bytes: Uint8Array,
  cid: string,
  provider: DigestProvider = defaultCryptoProvider,
): Promise<boolean> {
  if (!HEX64_RE.test(cid)) return false;
  return (await sha256Hex(bytes, provider)) === cid;
}

/**
 * The pointer's IDENTITY string — the CONTENT fields only, NO expiry/sig. A lease
 * renewal (same content, fresh expiry + new sig) keeps the SAME identity, so the
 * lineage stays stable across heartbeats. Domain+version tagged, `|`-delimited, every
 * field strict-charset so no separator can shift a boundary (device-delegation pattern).
 */
function pointerIdentityString(p: Pick<OraclePointer, "cid" | "heads" | "version" | "prev" | "pub">): string {
  return [
    ORACLE_POINTER_DOMAIN,
    p.cid,
    p.heads.join(","),
    String(p.version),
    p.prev ?? "",
    p.pub,
  ].join("|");
}

/**
 * The SIGNED string — the identity PLUS the expiry lease, because the signature MUST
 * cover freshness (a peer must not be able to extend a stale pointer's life).
 */
function pointerSigningString(p: Omit<OraclePointer, "sig">): string {
  return pointerIdentityString(p) + "|" + String(p.expiry);
}

/**
 * The pointer's stable id — what the NEXT pointer names in its `prev` (the lineage
 * link). Computed over the IDENTITY (not expiry/sig), so renewing the lease never
 * forks the lineage; a changed content field (cid/version/prev) does change the id.
 */
export async function oraclePointerId(
  p: OraclePointer,
  provider: DigestProvider = defaultCryptoProvider,
): Promise<string> {
  return sha256Hex(utf8Bytes(pointerIdentityString(p)), provider);
}

/** Build + sign the next pointer. `version` MUST exceed the prior pointer's (monotone). */
export async function buildOraclePointer(args: {
  readonly snapshot: OracleSnapshot;
  readonly version:  number;
  readonly prev:     string | null;
  readonly expiry:   number;
  /** 32-byte ed25519 seed (the publisher's signing key — operator/node). */
  readonly signerSeed: Uint8Array;
}): Promise<OraclePointer> {
  if (!Number.isInteger(args.version) || args.version < 0) {
    throw new Error(`oracle-pointer: version must be a non-negative integer, got ${args.version}`);
  }
  if (!Number.isFinite(args.expiry) || args.expiry <= 0) {
    throw new Error(`oracle-pointer: expiry must be a positive epoch-ms, got ${args.expiry}`);
  }
  const pub    = hex(await ed25519.getPublicKeyAsync(args.signerSeed));
  const fields: Omit<OraclePointer, "sig"> = {
    cid:     args.snapshot.cid,
    heads:   args.snapshot.heads,
    version: args.version,
    prev:    args.prev,
    expiry:  args.expiry,
    pub,
  };
  const sig = hex(await ed25519.signAsync(utf8Bytes(pointerSigningString(fields)), args.signerSeed));
  return { ...fields, sig };
}

export interface PointerVerdict {
  readonly ok:     boolean;
  readonly reason?: string;
}

/**
 * The reader rule — never throws. Pass what the reader remembers:
 *   - `verifyingKey`: pin the publisher; reject a pointer signed by anyone else.
 *   - `highWaterVersion`: the highest version this reader has accepted; a lower one
 *     reads as a ROLLBACK and gets refused (coordinator-free anti-rollback).
 *   - `lastPointerId`: the id of the last pointer this reader held; a `prev` that does
 *     not match it flags a LINEAGE break (an equivocation/fork to surface via gossip).
 *   - `nowMs`: the reader's LOCAL clock; past `expiry` reads as stale (no global now).
 */
export async function verifyOraclePointer(
  p: OraclePointer,
  opts: {
    readonly verifyingKey?:     string;
    readonly highWaterVersion?: number;
    readonly lastPointerId?:    string;
    readonly nowMs:             number;
  },
): Promise<PointerVerdict> {
  // Shape — reject malformed input without throwing.
  if (!p || typeof p !== "object")                              return { ok: false, reason: "malformed pointer" };
  if (!HEX64_RE.test(p.cid))                                    return { ok: false, reason: "bad cid" };
  if (!HEX64_RE.test(p.pub))                                    return { ok: false, reason: "bad pub" };
  if (!SIG_RE.test(p.sig))                                      return { ok: false, reason: "bad sig format" };
  if (!Number.isInteger(p.version) || p.version < 0)            return { ok: false, reason: "bad version" };
  if (!Number.isFinite(p.expiry))                               return { ok: false, reason: "bad expiry" };
  if (p.prev !== null && !HEX64_RE.test(p.prev))               return { ok: false, reason: "bad prev" };
  if (!Array.isArray(p.heads) || !p.heads.every((h) => HEX64_RE.test(h)))
    return { ok: false, reason: "bad heads" };

  // Pinned publisher.
  if (opts.verifyingKey !== undefined && p.pub !== opts.verifyingKey)
    return { ok: false, reason: "unpinned publisher" };

  // Signature.
  let sigOk = false;
  try {
    sigOk = await ed25519.verifyAsync(
      hexToBytes(p.sig), utf8Bytes(pointerSigningString(p)), hexToBytes(p.pub),
    );
  } catch { sigOk = false; }
  if (!sigOk) return { ok: false, reason: "signature verify failed" };

  // Anti-rollback: a lower version than remembered is a replay/rollback.
  if (opts.highWaterVersion !== undefined && p.version < opts.highWaterVersion)
    return { ok: false, reason: "rollback (version below high-water)" };

  // Anti-equivocation: a prev that does not link the last-known pointer is a fork.
  if (opts.lastPointerId !== undefined && p.prev !== opts.lastPointerId)
    return { ok: false, reason: "lineage break (prev does not link last pointer)" };

  // Freshness lease — local clock only.
  if (opts.nowMs >= p.expiry) return { ok: false, reason: "expired" };

  return { ok: true };
}

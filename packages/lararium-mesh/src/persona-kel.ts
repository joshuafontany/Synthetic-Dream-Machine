/**
 * persona-kel — the per-PersonaGroup KEY-EVENT-LOG: a stable identifier PREFIX the operational signing
 * key rotates BENEATH. Reading-B (identity-classes#reading-b-recovery) rotates the op-key rather than
 * resurrecting it, so continuity CANNOT ride the op-key — it rides this log. The module lifts the charter's
 * proven epoch-chain machinery (wax-stamp: SealEpoch / verifySealLineage / rotateSealEpoch) DOWN to
 * persona scale; it invents nothing structural, it re-sites what stands.
 *
 * The invariant (identity-classes#the-continuity-anchor):
 *   · the IDENTIFIER PREFIX — a content-address over the inception op-key + the pre-committed recovery-set
 *     digest — stays FIXED across every rotation (the KERI autonomic-identifier / AID),
 *   · each event SEATS one operational key (`opKeyDid`); the LATEST head carries the authoritative key,
 *   · a rotation ADVANCES the head, hash-linked onto its predecessor; the old op-key SUPERSEDES, never
 *     revives (evict runs forward-only — identity-classes#reading-b-recovery §4).
 *
 * FORK B — threshold-attest (identity-classes#the-two-forks): inception pre-commits the k-of-n DIGEST of
 * the guardians' recovery PUBLIC keys (`sealKeySetHash`); a rotation carries k guardian SIGNATURES over
 * the event bytes, verified against that pre-commit. NOTHING reconstructs — no secret ever assembles. The
 * recovery authority signs ONLY rotations, never content; a thief of today's op-key learns nothing of it.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/persona-kel
 */

import { PERSONA_KEL_DOMAIN } from "./domains.js";
import * as ed25519 from "@noble/ed25519";
import { sha256HexSync, canonicalJson, canonicalJsonBytes, hexToBytes } from "./crypto.js";
import { sealKeySetHash } from "./wax-stamp.js";
import type { QuorumSignature } from "./kapae-antigen.js";
import { verifyDeviceDelegation, type DeviceDelegationTiddler } from "./device-delegation.js";

/** The domain the persona-KEL prefix + event bytes tag — separates a persona AID from every other hash. */
export { PERSONA_KEL_DOMAIN } from "./domains.js";
/**
 * One event in a persona's pre-rotated, hash-linked key-event-log. Content-addressed by `eventCid`.
 *
 * At INCEPTION (seq 0): `recoveryRoster` stays EMPTY and `recoveryThreshold` reads 0 — inception commits
 * only the recovery DIGEST (`recoverySetHash`), never the roster (the KERI pre-rotation reveal happens at
 * the rotation, never before). At a ROTATION (seq > 0): the roster REVEALS (its digest MUST recompute to
 * the carried `recoverySetHash`) and `rotationSigs` carries ≥ threshold DISTINCT guardian signatures.
 */
export interface PersonaKelEvent {
  readonly seq:               number;              // monotonic sequence; inception = 0
  readonly eventCid:          string;             // content-address of THIS event (its own hash)
  readonly prefix:            string;             // the STABLE identifier (AID) — fixed across every rotation
  readonly opKeyDid:          string;             // "0x"+hex — the operational key this event SEATS (head = authoritative)
  readonly recoverySetHash:   string;             // sealKeySetHash(recoveryRoster, recoveryThreshold), pre-committed at inception
  readonly recoveryRoster:    readonly string[];  // the n guardian recovery pubkeys — EMPTY at inception, REVEALED at a rotation
  readonly recoveryThreshold: number;             // k — REVEALED at a rotation (0 at inception; folded into recoverySetHash)
  readonly prevEventCid:      string | null;      // hash-link to the predecessor (null at inception)
  readonly rotationSigs:      readonly QuorumSignature[]; // [] at inception; ≥ threshold guardian sigs on a rotation
}

/** The authority fields an event's content-address + the guardian signatures BOTH bind — the fields a
 *  rotation attests over. The revealed roster/threshold ride OUTSIDE (verified against `recoverySetHash`,
 *  which IS bound here), so re-carrying an event never re-signs it (the kapae-antigen sig-outside pattern). */
type PersonaEventCore = Pick<
  PersonaKelEvent,
  "seq" | "prefix" | "opKeyDid" | "recoverySetHash" | "prevEventCid"
>;

/** The canonical bytes an event's cid commits AND each guardian rotation-signature signs over. Binding the
 *  seq + prefix + the seated op-key + the recovery-commit + the prev-link ties a guardian attestation to
 *  the EXACT rotation context — a signature never replays onto a different head, op-key, or fork. */
export function personaEventBytes(core: PersonaEventCore): Uint8Array {
  return canonicalJsonBytes({
    domain:          PERSONA_KEL_DOMAIN,
    seq:             core.seq,
    prefix:          core.prefix,
    opKeyDid:        core.opKeyDid,
    recoverySetHash: core.recoverySetHash,
    prevEventCid:    core.prevEventCid,
  });
}

/** The content-address of a persona-KEL event — a hash BINDING its authority core. A single bit-flip in any
 *  bound field yields a different cid, so the `eventCid` the next event hash-links against is tamper-evident. */
export function personaEventCidOf(core: PersonaEventCore): string {
  return `pkel${core.seq}-${sha256HexSync(canonicalJson({
    domain:          PERSONA_KEL_DOMAIN,
    seq:             core.seq,
    prefix:          core.prefix,
    opKeyDid:        core.opKeyDid,
    recoverySetHash: core.recoverySetHash,
    prevEventCid:    core.prevEventCid,
  }))}`;
}

/**
 * The persona identifier PREFIX (AID) — a content-address over the INCEPTION op-key + the pre-committed
 * recovery-set digest. It stays FIXED for the persona's whole life; every rotation carries it unchanged.
 * Binding the recovery digest INTO the prefix walls off a swap: no attacker incepts a DIFFERENT recovery
 * set under the same identifier (identity-classes#the-continuity-anchor).
 */
export function personaPrefixOf(inceptionOpKeyDid: string, recoverySetHash: string): string {
  return `persona-${sha256HexSync(canonicalJson({
    domain:          PERSONA_KEL_DOMAIN,
    op:              inceptionOpKeyDid,
    recoverySetHash,
  }))}`;
}

/**
 * Seat the INCEPTION event (seq 0, no predecessor) from the founding op-key + a PRE-COMMITMENT to the
 * guardians' recovery key-set (its digest, `sealKeySetHash`). The founding op-key seats itself here
 * self-authorized — exactly as today's founder edge self-signs; the recovery keys never sign until a
 * rotation reveals them, so a compromise of the operational PRESENT cannot forge the recovery FUTURE.
 *
 * The caller derives `recoverySetHash` from the guardians' recovery PUBLIC keys via `sealKeySetHash`
 * (order-blind, threshold-folded). An empty digest leaves recovery UNARMED — `mintPersonaRotation` then
 * refuses (nothing stands pre-committed to attest a reveal against).
 */
export function mintPersonaInception(opKeyDid: string, recoverySetHash: string): PersonaKelEvent {
  const prefix = personaPrefixOf(opKeyDid, recoverySetHash);
  const core: PersonaEventCore = { seq: 0, prefix, opKeyDid, recoverySetHash, prevEventCid: null };
  return {
    ...core,
    eventCid:          personaEventCidOf(core),
    recoveryRoster:    [],   // inception commits only the DIGEST — the reveal rides a rotation
    recoveryThreshold: 0,
    rotationSigs:      [],
  };
}

/**
 * The exact bytes each guardian SIGNS to attest a rotation — the (head, fresh-op-key) rotation request,
 * bound to the next seq + the stable prefix + the recovery-commit + the prev-link. The recovering vessel
 * hands THESE bytes to each guardian; each signs with their OWN recovery key and returns a signature, and
 * NOTHING assembles (no seed, no share). `mintPersonaRotation` recomputes the identical bytes to verify.
 */
export function personaRotationSigningBytes(head: PersonaKelEvent, freshOpKeyDid: string): Uint8Array {
  return personaEventBytes({
    seq:             head.seq + 1,
    prefix:          head.prefix,
    opKeyDid:        freshOpKeyDid,
    recoverySetHash: head.recoverySetHash,
    prevEventCid:    head.eventCid,
  });
}

/** A rotation attempt's outcome — the advanced event, or a fail-closed REFUSAL naming the mismatch. */
export type PersonaRotateResult =
  | { readonly ok: true;  readonly event: PersonaKelEvent }
  | { readonly ok: false; readonly reason: string };

/**
 * Advance the KEL: REVEAL the pre-committed guardian recovery roster and seat a FRESH operational key,
 * authorized by ≥ threshold DISTINCT guardian signatures over the event bytes. FAILS CLOSED five ways —
 * an unarmed head (empty `recoverySetHash`) refuses; a revealed roster whose digest does not match the
 * head's `recoverySetHash` refuses (a forged / wrong-threshold reveal); below-threshold DISTINCT valid
 * signers refuses; a signer absent from the revealed roster does not count; a signature that does not
 * verify over the event bytes does not count. The minted event hash-links to `head.eventCid`, so
 * `verifyPersonaKel` walks an unbroken lineage through it.
 *
 * NOTHING reconstructs — the guardians each SIGN their own attestation; no seed or share ever assembles.
 * The prefix + `recoverySetHash` carry forward UNCHANGED (the identifier survives; the op-key turns over).
 */
export async function mintPersonaRotation(input: {
  readonly head:              PersonaKelEvent;
  readonly freshOpKeyDid:     string;               // the operational key the recovering vessel just minted
  readonly recoveryRoster:    readonly string[];    // the REVEALED n guardian recovery pubkeys
  readonly recoveryThreshold: number;               // k — the reveal's threshold; folds into recoverySetHash
  readonly rotationSigs:      readonly QuorumSignature[]; // the gathered guardian signatures over the event bytes
}): Promise<PersonaRotateResult> {
  const { head, freshOpKeyDid, recoveryRoster, recoveryThreshold, rotationSigs } = input;
  if (head.recoverySetHash.length === 0) {
    return { ok: false, reason: "rotation unarmed — the head event pre-committed no recovery-set digest" };
  }
  if (sealKeySetHash(recoveryRoster, recoveryThreshold) !== head.recoverySetHash) {
    return { ok: false, reason: "reveal mismatch — the revealed recovery roster does not match the pre-committed digest" };
  }
  const core: PersonaEventCore = {
    seq:             head.seq + 1,
    prefix:          head.prefix,          // the identifier stays FIXED
    opKeyDid:        freshOpKeyDid,
    recoverySetHash: head.recoverySetHash, // the recovery commit carries forward unchanged
    prevEventCid:    head.eventCid,
  };
  const quorum = await verifyRotationQuorum(core, recoveryRoster, recoveryThreshold, rotationSigs);
  if (!quorum.ok) return { ok: false, reason: quorum.reason ?? "rotation quorum unsatisfied" };
  return {
    ok: true,
    event: { ...core, eventCid: personaEventCidOf(core), recoveryRoster: [...recoveryRoster], recoveryThreshold, rotationSigs: [...rotationSigs] },
  };
}

/**
 * Verify a rotation's THRESHOLD-ATTEST quorum — the strictest never-reconstruct gate. FAILS CLOSED:
 *   · the revealed roster's digest MUST equal the pre-committed `recoverySetHash` (a swapped roster fails),
 *   · a signer ABSENT from the revealed roster does not count (a stranger cannot pad the quorum),
 *   · a signer counted TWICE counts once (a replayed signature cannot pad the quorum),
 *   · a signature that does not verify over the event bytes does not count (tamper-evident),
 *   · below `recoveryThreshold` distinct valid signers → REFUSE.
 * Mirrors `makeMultiSigQuorumVerifier` (kapae-antigen), bound over the persona-event bytes.
 */
export async function verifyRotationQuorum(
  core:              PersonaEventCore,
  recoveryRoster:    readonly string[],
  recoveryThreshold: number,
  rotationSigs:      readonly QuorumSignature[],
): Promise<{ ok: boolean; reason?: string }> {
  if (recoveryThreshold < 1) return { ok: false, reason: "recovery threshold below 1" };
  if (recoveryRoster.length < recoveryThreshold) return { ok: false, reason: "revealed roster shorter than the threshold" };
  if (sealKeySetHash(recoveryRoster, recoveryThreshold) !== core.recoverySetHash) {
    return { ok: false, reason: "revealed roster digest does not match the pre-committed recovery-set" };
  }
  const rosterSet = new Set(recoveryRoster.map((k) => k.toLowerCase()));
  const bytes     = personaEventBytes(core);
  const counted   = new Set<string>();
  for (const s of rotationSigs) {
    const signer = s.signer.toLowerCase();
    if (counted.has(signer))     continue;   // a signer pads the quorum at most once
    if (!rosterSet.has(signer))  continue;   // a non-roster signer never counts
    let ok = false;
    try { ok = await ed25519.verifyAsync(hexToBytes(s.sig), bytes, hexToBytes(signer)); }
    catch { ok = false; }                     // a malformed sig/key counts as no signature
    if (ok) counted.add(signer);
    if (counted.size >= recoveryThreshold) return { ok: true };
  }
  return { ok: false, reason: `below-threshold quorum: ${counted.size}/${recoveryThreshold} distinct valid guardian signatures` };
}

/**
 * Verify the KEL's STRUCTURAL integrity: monotonic sequence + hash-links + a STABLE prefix and STABLE
 * recovery-commit across every event, each event's cid recomputing over its bound core. Inception (seq 0)
 * carries no predecessor and its prefix MUST derive from its own op-key + recovery-set (the AID binding).
 * PURE — it verifies no signatures (a rotation's quorum rides `verifyRotationQuorum` / `verifyPersonaKelFull`,
 * which need the revealed roster). Mirrors `verifySealLineage`.
 */
export function verifyPersonaKel(chain: readonly PersonaKelEvent[]): boolean {
  if (chain.length === 0) return false;
  const genesis = chain[0]!;
  if (genesis.seq !== 0 || genesis.prevEventCid !== null) return false;
  if (genesis.prefix !== personaPrefixOf(genesis.opKeyDid, genesis.recoverySetHash)) return false;
  if (genesis.eventCid !== personaEventCidOf(genesis)) return false;
  for (let i = 1; i < chain.length; i++) {
    const e = chain[i]!, prev = chain[i - 1]!;
    if (e.seq !== prev.seq + 1)                     return false;   // monotonic
    if (e.prevEventCid !== prev.eventCid)           return false;   // hash-linked
    if (e.prefix !== prev.prefix)                   return false;   // the identifier stays fixed
    if (e.recoverySetHash !== prev.recoverySetHash) return false;   // the recovery commit stays fixed
    if (e.eventCid !== personaEventCidOf(e))        return false;   // cid recomputes over the bound core
  }
  return true;
}

/**
 * Verify the KEL structurally AND verify EVERY rotation's threshold-attest quorum — the full assurance a
 * gate needs before trusting the head op-key. Each rotation (seq > 0) MUST carry a ≥ threshold distinct
 * guardian quorum over its own bytes; inception carries none (self-authorized). FAILS CLOSED on the first
 * structural break or unsatisfied rotation quorum.
 */
export async function verifyPersonaKelFull(chain: readonly PersonaKelEvent[]): Promise<{ ok: boolean; reason?: string }> {
  if (!verifyPersonaKel(chain)) return { ok: false, reason: "structural integrity failed (sequence / hash-link / prefix / recovery-commit / cid)" };
  for (let i = 1; i < chain.length; i++) {
    const e = chain[i]!;
    const core: PersonaEventCore = {
      seq: e.seq, prefix: e.prefix, opKeyDid: e.opKeyDid, recoverySetHash: e.recoverySetHash, prevEventCid: e.prevEventCid,
    };
    const q = await verifyRotationQuorum(core, e.recoveryRoster, e.recoveryThreshold, e.rotationSigs);
    if (!q.ok) return { ok: false, reason: `rotation seq ${e.seq}: ${q.reason ?? "quorum unsatisfied"}` };
  }
  return { ok: true };
}

/**
 * The authoritative operational key — the LATEST head's `opKeyDid`, IFF the KEL verifies structurally.
 * Returns null on a broken chain (a gate MUST NOT trust a head off a broken lineage). Pass
 * `{ verifyQuorums: true }` to additionally require every rotation's guardian quorum before returning a
 * head (fail-closed to null otherwise) — the strict read a live gate wants.
 */
export async function headOpKey(
  chain: readonly PersonaKelEvent[],
  opts: { verifyQuorums?: boolean } = {},
): Promise<string | null> {
  if (opts.verifyQuorums) {
    if (!(await verifyPersonaKelFull(chain)).ok) return null;
  } else if (!verifyPersonaKel(chain)) {
    return null;
  }
  return chain[chain.length - 1]!.opKeyDid;
}

/**
 * THE GATE-WALK MECHANISM (the Binding-Gate pin-move's pure core, NOT yet wired into the live gate — the
 * wiring surfaces as a plan, identity-classes#the-continuity-anchor). Walk the persona-KEL to its CURRENT
 * authoritative op-key, then verify a device-delegation edge against THAT head — the pin moves from a raw
 * op-key to the identifier's live head. A rotated key still verifies (a fresh edge re-issued under the new
 * head passes); an edge signed by a SUPERSEDED op-key rejects (it is no longer the head).
 *
 * FAIL-CLOSED: a broken KEL, an unsatisfied rotation quorum (always checked here — a gate trusts a head only
 * when every rotation carries its guardian quorum), or an edge that does not chain to the head all deny.
 * The edge's `deviceDid`-binding + freshness stay the caller's concern (the existing Binding-Gate checks).
 */
export async function verifyEdgeAgainstPersonaKel(
  edge:  DeviceDelegationTiddler,
  chain: readonly PersonaKelEvent[],
  opts?: { now?: number; driftMs?: number },
): Promise<{ ok: boolean; reason?: string; headOpKey?: string }> {
  const head = await headOpKey(chain, { verifyQuorums: true });
  if (head === null) return { ok: false, reason: "persona-KEL failed structural or rotation-quorum verification" };
  const r = await verifyDeviceDelegation(edge, head, opts?.now !== undefined ? { now: opts.now, ...(opts.driftMs !== undefined ? { driftMs: opts.driftMs } : {}) } : undefined);
  return r.ok ? { ok: true, headOpKey: head } : { ok: false, reason: r.reason ?? "edge does not chain to the KEL head op-key", headOpKey: head };
}

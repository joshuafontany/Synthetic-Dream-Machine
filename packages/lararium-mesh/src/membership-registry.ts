/**
 * membership-registry — the operator MEMBERS-registry: the Kapae-antigen's ALLOW-twin. Where the antigen
 * folds a quorum-signed DENY set (who stands banned), this folds a quorum-signed ALLOW set (who stands a
 * contracted Nexus member). Same CRDT shape (monotone/additive, highest-version-per-nym, same-version
 * fail-closed), same quorum authority (≥ k founding-kahu signatures rooted on the charter epoch), and it
 * FAILS CLOSED at every seam. `blocked{}` ⊥ `members{}` (carry-contract): a nym may sit in either, neither,
 * or — pathologically — both (the antigen still draws Mu; a ban outranks a membership at enforcement).
 *
 * TRACK CONTRACTS, NEVER IDENTITIES (membership-doctrine). A MembershipEntry carries the operator-contract
 * FLOOR and nothing above it: the operator's PUBKEY (the nym), the CHARTER-EPOCH it roots on, and — for an
 * admit — proof the operator SIGNED "I accept carriage" (the `contractSig`). NO name, NO email, NO device
 * list, NO behavior. A user NEVER lands here — this registry names contracting OPERATORS only; a user
 * soft-attaches and leaves no roster trace (membership-doctrine #the-two-stacks).
 *
 * WAX-SEALS ONLY, NEVER A REGISTRAR GRANT. An admit is not a central registrar writing a row — it is a
 * quorum of stewards counter-signing an act the operator itself consented to. Two seals ride every admit:
 *   · the OPERATOR's own signature over a version-independent "accepts carriage" token (`contractSig`) — the
 *     contract-in; without it, an admit does NOT count (a Nexus cannot conscript an operator into carriage).
 *   · ≥ k founding-kahu quorum signatures over the entry — the steward act (identical to the antigen's).
 * A REVOKE needs the steward quorum only (an uncooperative member cannot veto its own removal), mirroring
 * the antigen's `un_kapae`.
 *
 * FAIL CLOSED, every seam: an entry whose kahu quorum does not verify is IGNORED; an admit missing / carrying
 * a bad `contractSig` is IGNORED (never a member); an entry rooting on an unknown charter epoch is IGNORED; a
 * same-version admit/revoke tie stays a NON-member (a tie never grants membership — the more-restrictive act
 * wins, exactly as a kapae beats an un_kapae). An unbound (empty-key) roster meets no threshold → nobody reads
 * member.
 *
 * Platform-blind: rides ./crypto + @noble/ed25519 + ./kapae-antigen types only. NO node: imports.
 * Meme: lar:///ha.ka.ba/lararium/mesh/membership-doctrine#the-operator-contract
 */

import * as ed25519 from "@noble/ed25519";
import { canonicalJsonBytes, hexToBytes } from "./crypto.js";
import type { QuorumSignature, KahuCharterRoster } from "./kapae-antigen.js";
import { quorumEntryBytes } from "./quorum-entry.js";

/** The domain a MembershipEntry's quorum signs over — a signature is meaningless without its domain. */
export const MEMBERSHIP_ENTRY_DOMAIN = "lar-membership-entry/v1" as const;

/** The domain the operator's OWN "accepts carriage" contract-token signs over — DISTINCT from the entry
 *  domain, and version-INDEPENDENT: the operator consents to carriage-under-this-epoch ONCE, and a kahu
 *  quorum may then admit / re-admit it at any monotone version citing that one standing consent. */
export const CARRIAGE_CONTRACT_DOMAIN = "lar-carriage-contract/v1" as const;

/** A steward act on the members set: ADMIT an operator into carriage, or REVOKE it. Monotone per-nym. */
export type MembershipAction = "admit" | "revoke";

/**
 * One entry in the members set — a quorum-signed admit or revoke of ONE operator nym. Monotone/additive
 * CRDT (entries only accrete; the fold reads the highest-version verified entry per nym). The signatures
 * ride OUTSIDE the signed content, so re-carrying an entry never re-signs it (the antigen's discipline).
 *
 * THE PAYLOAD FLOOR (membership-doctrine): pubkey (`nym`) + charter-epoch + the accepts-carriage proof
 * (`contractSig`), and NOTHING else the antigen entry does not also carry. No identity of the human behind
 * the key ever rides here.
 */
export interface MembershipEntry {
  readonly kind:            typeof MEMBERSHIP_ENTRY_DOMAIN;
  /** The contracting operator's ed25519 verifying-key hex — the member nym (an operator pubkey, never a doc). */
  readonly nym:             string;
  /** ADMIT the operator into carriage, or REVOKE it. */
  readonly action:          MembershipAction;
  /** Monotone per-nym: a later steward act supersedes an earlier one; a stale entry cannot roll it back. */
  readonly version:         number;
  /** The nexus-charter epoch this quorum act roots on (the wax-stamp epoch-chain — CharterEpoch.epochCid). */
  readonly charterEpochCid: string;
  /** ≥ threshold distinct founding-kahu signatures over `membershipEntryBytes` — the steward quorum. */
  readonly signatures:      readonly QuorumSignature[];
  /**
   * The OPERATOR's OWN signature over `carriageContractBytes({ nym, charterEpochCid })` — the contract-in.
   * REQUIRED for an `admit` to count (its `signer` MUST equal `nym`); ABSENT / ignored for a `revoke`. This is
   * the "accepts carriage" wax-seal from the member itself; without it a Nexus cannot conscript an operator.
   */
  readonly contractSig?:    QuorumSignature;
}

/**
 * The canonical bytes the KAHU QUORUM signs over — everything but the signatures + the contract sig.
 * Composes the shared quorum-entry image at the MEMBERSHIP domain; that domain keeps a membership signature
 * un-presentable on the antigen board (`quorum-entry.ts`). The operator's accepts-carriage token signs
 * SEPARATE bytes (`carriageContractBytes`) and stays a distinct, board-local gate.
 */
export function membershipEntryBytes(
  entry: Omit<MembershipEntry, "signatures" | "contractSig">,
): Uint8Array {
  return quorumEntryBytes(entry);
}

/**
 * The canonical bytes the OPERATOR signs over to accept carriage — version-INDEPENDENT (only the nym + the
 * charter epoch). The operator signs this ONCE; a kahu quorum may cite the resulting `contractSig` on any
 * monotone admit version. The token IS the acceptance — its verified presence proves "accepts carriage".
 */
export function carriageContractBytes(parts: { nym: string; charterEpochCid: string }): Uint8Array {
  return canonicalJsonBytes({
    kind:            CARRIAGE_CONTRACT_DOMAIN,
    nym:             parts.nym,
    charterEpochCid: parts.charterEpochCid,
  });
}

/**
 * Verify a k-of-n founding-kahu quorum over a MembershipEntry — the SAME k-of-n multi-signature the antigen's
 * `makeMultiSigQuorumVerifier` runs, re-applied at the membership domain (that antigen verifier stays
 * UNCHANGED for the antigen). Guards, each fail-closed: a non-roster signer never counts; a signer counted
 * twice counts once; a signature that does not verify over the entry bytes does not count; the entry MUST root
 * on the roster's charter epoch. An unbound / short roster meets no threshold → false.
 */
async function verifyMembershipQuorum(entry: MembershipEntry, roster: KahuCharterRoster): Promise<boolean> {
  if (entry.kind !== MEMBERSHIP_ENTRY_DOMAIN)             return false;
  if (roster.threshold < 1)                              return false;
  if (roster.keys.length < roster.threshold)             return false;   // unbound / short roster → deny
  if (entry.charterEpochCid !== roster.charterEpochCid)  return false;   // roots on an unknown epoch → deny

  const rosterKeys = new Set(roster.keys.map((k) => k.toLowerCase()));
  const bytes      = membershipEntryBytes(entry);
  const counted    = new Set<string>();
  for (const s of entry.signatures) {
    const signer = s.signer.toLowerCase();
    if (counted.has(signer))     continue;   // a signer pads the quorum at most once
    if (!rosterKeys.has(signer)) continue;   // a non-roster signer never counts
    let ok = false;
    try { ok = await ed25519.verifyAsync(hexToBytes(s.sig), bytes, hexToBytes(s.signer)); }
    catch { ok = false; }                    // a malformed sig / key counts as no signature
    if (ok) counted.add(signer);
    if (counted.size >= roster.threshold) return true;
  }
  return false;
}

/**
 * Verify the operator's own "accepts carriage" contract-sig on an ADMIT entry. FAIL CLOSED: no contractSig,
 * a contractSig whose `signer` is not the entry's own nym, or a signature that does not verify over the
 * version-independent carriage-token bytes — each reads false (the admit then does NOT count). A Nexus can
 * never manufacture this seal: only the operator holding the nym's seed can produce it.
 */
async function verifyContractIn(entry: MembershipEntry): Promise<boolean> {
  const cs = entry.contractSig;
  if (!cs) return false;
  if (cs.signer.toLowerCase() !== entry.nym.toLowerCase()) return false;   // the seal MUST be the operator's own
  const bytes = carriageContractBytes({ nym: entry.nym, charterEpochCid: entry.charterEpochCid });
  try { return await ed25519.verifyAsync(hexToBytes(cs.sig), bytes, hexToBytes(entry.nym)); }
  catch { return false; }
}

/**
 * Does this WHOLE entry count? A REVOKE counts on the kahu quorum alone. An ADMIT counts ONLY when BOTH the
 * kahu quorum AND the operator's own contract-in verify — the two wax-seals the doctrine requires. Anything
 * short is ignored, never guessed into membership. Exported so a WRITER can self-verify before landing an entry
 * (never write an entry the fold would ignore — a written-but-dead admit reads as enforced while granting nothing).
 */
export async function membershipEntryCounts(entry: MembershipEntry, roster: KahuCharterRoster): Promise<boolean> {
  if (!(await verifyMembershipQuorum(entry, roster))) return false;
  if (entry.action === "revoke") return true;
  return verifyContractIn(entry);   // admit → the operator must have signed "accepts carriage"
}

/**
 * Sign a MembershipEntry's KAHU QUORUM — collect ≥ threshold of these into an entry's `signatures`. The
 * module holds no key; each kahu supplies its own signer (mirrors the antigen's `signAntigenEntry`).
 */
export async function signMembershipQuorum(
  parts: Omit<MembershipEntry, "kind" | "signatures" | "contractSig">,
  signers: ReadonlyArray<{ readonly signer: string; readonly sign: (bytes: Uint8Array) => Promise<string> }>,
  contractSig?: QuorumSignature,
): Promise<MembershipEntry> {
  const unsigned = { ...parts, kind: MEMBERSHIP_ENTRY_DOMAIN } as Omit<MembershipEntry, "signatures" | "contractSig">;
  const bytes = membershipEntryBytes(unsigned);
  const signatures: QuorumSignature[] = [];
  for (const s of signers) signatures.push({ signer: s.signer, sig: await s.sign(bytes) });
  const entry: MembershipEntry = { ...unsigned, signatures };
  return contractSig ? { ...entry, contractSig } : entry;
}

/**
 * Mint the operator's "accepts carriage" contract-sig — the contract-in the operator signs ONCE for a charter
 * epoch. The caller supplies the operator's own signer (the module holds no key). The returned `QuorumSignature`
 * rides an admit entry's `contractSig`.
 */
export async function signCarriageContract(
  nym: string,
  charterEpochCid: string,
  sign: (bytes: Uint8Array) => Promise<string>,
): Promise<QuorumSignature> {
  const sig = await sign(carriageContractBytes({ nym, charterEpochCid }));
  return { signer: nym, sig };
}

/**
 * Fold the membership entries into the CURRENTLY-admitted operator-nym set. Only entries that fully COUNT
 * (kahu quorum, plus the contract-in for an admit) participate — everything else is IGNORED, never trusted.
 * Per nym the fold keeps the highest-version counted entry; a nym reads MEMBER iff that winner is an `admit`.
 * FAIL CLOSED on equivocation: an `admit` and a `revoke` at the SAME version leave the nym a NON-member (a tie
 * never grants membership — the more-restrictive `revoke` wins, mirroring the antigen's kapae-beats-un_kapae).
 *
 * The result is a plain nym set — the enforcement seam (nexus-membership → memberCarryShareDecision) unions it
 * with the seated-kahu floor and reads it to decide MEMBER vs STRANGER.
 */
export async function foldMembershipSet(
  entries: Iterable<MembershipEntry>,
  roster: KahuCharterRoster,
): Promise<ReadonlySet<string>> {
  // Per nym, the winning counted entry: highest version; on a version tie, `revoke` beats `admit`.
  const winner = new Map<string, { version: number; action: MembershipAction }>();
  for (const entry of entries) {
    if (!(await membershipEntryCounts(entry, roster))) continue;   // uncounted → ignored, never trusted
    const nym = entry.nym.toLowerCase();
    const cur = winner.get(nym);
    if (cur === undefined || entry.version > cur.version) {
      winner.set(nym, { version: entry.version, action: entry.action });
    } else if (entry.version === cur.version && entry.action === "revoke") {
      cur.action = "revoke";   // same-version tie drops membership (fail-closed against an equivocating admit)
    }
  }
  const members = new Set<string>();
  for (const [nym, w] of winner) if (w.action === "admit") members.add(nym);
  return members;
}

/** Does this operator nym stand a contracted member in the folded members set? */
export function isMember(nym: string, memberSet: ReadonlySet<string>): boolean {
  return memberSet.has(nym.toLowerCase());
}

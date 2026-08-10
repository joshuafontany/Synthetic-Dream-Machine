/**
 * recovery-keel-core — the founding-split + recover-readmit FLOWS (platform-blind).
 *
 * The lone-citizen truth: the device-share dies WITH the device, so recovery cannot ride it. A founding
 * split is 2-of-3 {device, recorded-code, escrow-peer} — normal life uses any two, but a drowned device
 * recovers from {recorded-code (the citizen wrote it down) + escrow (a peer relays it)}. Neither party
 * recovers alone: the recovery quorum IS the impersonation quorum, and it needs both (recovery-share
 * enforces this at the TYPE wall — a single-custodian set can never construct a Quorum).
 *
 * The crypto primitives already sit in mesh (recovery-share: splitToShares / assembleQuorum /
 * reconstructFromQuorum / encodeShareBytes). Only the FLOW lifts here, over two injected shores:
 *   · the PersonaVault — supplies the root seed to split + the sealed device-share store,
 *   · the readmit runner — the keyhive edge-signing step, injected because keyhive DEPENDS ON mesh
 *     (mesh importing keyhive would cycle). The core reconstructs the branded ReadmissionSecret and hands
 *     it to the runner; the platform binds the concrete `runReadmitEdge`. Dependency inversion keeps the
 *     recovery flow keyhive-blind while the branded secret stays the one door into re-admission.
 *
 * Meme: lar:///ha.ka.ba/lararium/api/recovery-keel-core
 */

import type { RandomProvider } from "./crypto.js";
import {
  splitToShares, assembleQuorum, reconstructFromQuorum, encodeShareBytes,
  type RecoveryShare, type CustodianTag, type ReadmissionSecret,
} from "./recovery-share.js";
import { splitToGuardianCards, type GuardianCard, type GuardianCardSplit } from "./guardian-card.js";
import { assertHandleIndex, loadPersonaRootSeed, type PersonaVault } from "./persona-vault.js";
import { sealKeySetHash } from "./wax-stamp.js";
import type { QuorumSignature } from "./kapae-antigen.js";
import {
  mintPersonaInception, mintPersonaRotation, personaRotationSigningBytes,
  type PersonaKelEvent, type PersonaRotateResult,
} from "./persona-kel.js";

/**
 * How a runtime persists the DEVICE recovery-share, keyed by handle-index (one persona's quorum never
 * reconstructs another's root). The device-share is share material of the PersonaGroup root — self-only
 * secret — so the platform SEALS it at rest; the seal lives in the adapter, never in this core shore.
 */
export interface RecoveryShareStore {
  /** Read the device-share for ONE persona, or null when none has landed. */
  load(handleIndex: number): RecoveryShare | null;
  /** Persist (sealed) the device-share for ONE persona. */
  save(handleIndex: number, share: RecoveryShare): void;
}

/** The three shares a founding split produces. Any two DISTINCT custodians recover — so a lost device
 *  (its share gone) still recovers from {recorded-code, escrow-peer}. */
export interface FoundingShares {
  readonly deviceShare:       RecoveryShare;   // sealed on the device (dies with it — never the recovery path)
  readonly recordedCodeShare: RecoveryShare;   // the citizen writes it down (the one external factor)
  readonly escrowShare:       RecoveryShare;   // a peer/kahu holds it (≤1 share, cannot recover alone)
  /** The recorded-code share encoded for transcription (hex payload + checksum). */
  readonly recordedCode:      string;
  /** The escrow-peer share encoded for a peer to hold (relayed, never openable into a solo recovery). */
  readonly escrowCarrier:     string;
}

/**
 * Split the PersonaGroup root at founding into a 2-of-3 {device, recorded-code, escrow-peer}. The floor's
 * real job runs HERE, at onboarding: it forces one external factor (the recorded code) to exist before the
 * Handle carries standing — because no crypto recovers a secret from nothing. The caller seals the
 * device-share, surfaces the recorded code for the citizen to write down, and relays the escrow share.
 */
/** `recoveryEpoch` is a ROTATION GENERATION — carrier-A shaped (a monotone integer that rolls when the
 *  shares re-split), never a wall-clock and never Keyhive's CGKA epoch. See
 *  lar:///ha.ka.ba/lararium/mesh/epoch-binding-surfaces#whose-word-is-it */
export function splitRootAtFounding(rootSeed: Uint8Array, rng: RandomProvider, recoveryEpoch = 1): FoundingShares {
  const custodians: CustodianTag[] = ["device", "recorded-code", "escrow-peer"];
  const shares = splitToShares(rootSeed, 2, custodians, recoveryEpoch, rng);
  const byTag = (t: CustodianTag): RecoveryShare => shares.find((s) => s.custodian === t)!;
  const recordedCodeShare = byTag("recorded-code");
  const escrowShare = byTag("escrow-peer");
  return {
    deviceShare: byTag("device"),
    recordedCodeShare, escrowShare,
    recordedCode:  encodeShareBytes(recordedCodeShare.bytes),
    escrowCarrier: encodeShareBytes(escrowShare.bytes),
  };
}

/**
 * Reconstruct the root from a recovery quorum (≥ 2 distinct custodians) and re-admit a fresh device via the
 * INJECTED runner. The device-share is ABSENT after device loss; recovery rides {recorded-code, escrow}.
 * The reconstructed root zeroizes the instant re-admission returns — the reconstruction window kept as
 * narrow as the floor allows.
 *
 * `runReadmit` receives the branded ReadmissionSecret (never a bare Uint8Array) — the type gate the
 * platform's keyhive edge-signer already demands. The core stays keyhive-blind; the adapter binds it.
 */
export async function reconstructAndReadmit<Readmit, Payload>(
  quorumShares: readonly RecoveryShare[],
  readmit: Readmit,
  runReadmit: (reconstructedRoot: ReadmissionSecret, readmit: Readmit) => Promise<Payload>,
): Promise<Payload> {
  const reconstructedRoot = reconstructFromQuorum(assembleQuorum(quorumShares, 2));
  try {
    return await runReadmit(reconstructedRoot, readmit);
  } finally {
    reconstructedRoot.fill(0);   // close the reconstruction window immediately
  }
}

/**
 * Provision recovery at FOUNDING: split the freshly-minted PersonaGroup root at `handleIndex`, SEAL the
 * device-share into the vault's recovery store, and return the two shares the citizen carries OFF the
 * device — the recorded code (write it down) and the escrow carrier (hand to a peer). The floor's real
 * work runs here, because no crypto recovers a secret from nothing. The root seed zeroizes the instant it
 * is split.
 *
 * PER-PERSONA: a vessel wearing several personas provisions recovery per persona — each root splits into
 * its own 2-of-3 quorum and seals its own device-share, keyed by handle-index. (POLICY fork surfaced to
 * the operator: whether N personas on ONE disk constitute distinct-enough custodians for a real quorum is
 * NOT decided here; this splits the shore so either resolution stands.)
 */
export async function provisionRecoveryAtFounding(
  vault: PersonaVault,
  rng: RandomProvider,
  recoveryEpoch = 1,
  handleIndex = 0,
): Promise<{ recordedCode: string; escrowCarrier: string }> {
  assertHandleIndex(handleIndex);
  if (!vault.recovery) {
    throw new Error("[recovery-keel-core] this vault provisions no recovery store — cannot seal a device-share");
  }
  const rootSeed = await loadPersonaRootSeed(vault, handleIndex);
  try {
    const shares = splitRootAtFounding(rootSeed, rng, recoveryEpoch);
    vault.recovery.save(handleIndex, shares.deviceShare);
    return { recordedCode: shares.recordedCode, escrowCarrier: shares.escrowCarrier };
  } finally {
    rootSeed.fill(0);   // the root never lingers after the split
  }
}

/** The founding card issue for personal identity recovery — the three shared guardian cards + a flag that
 *  the "mine" (device) share sealed on this vessel. The two guardian cards leave the device by hand. */
export interface RecoveryCardsAtFounding {
  /** All three cards, the SHARED shape: "Recovery-card mine" + "guardian-A" + "guardian-B". */
  readonly cards:      GuardianCard[];
  /** True once the "mine" (device) share seals into the vault's recovery store. */
  readonly mineSealed: boolean;
}

/**
 * Provision identity recovery at FOUNDING as GUARDIAN CARDS — the pattern-integrity twin of the charter
 * reserve's `splitReserveSeed`. It splits the PersonaGroup root 2-of-3 into the SHARED card shape
 * (guardian-card: mine→device, guardian-a→guardian, guardian-b→escrow-peer), SEALS the "mine" (device)
 * share into the vault's recovery store, and returns all three cards — so the operator places "Recovery-card
 * mine" (its share sealed here) + two guardian cards by hand, IDENTICAL to the reserve ceremony. The
 * guardians who hold a citizen's reserve cards hold this same card shape for their identity.
 *
 * SEMANTICS (per canon, unchanged): the shares reconstruct the root TRANSIENTLY at recovery to sign a
 * re-admit edge for a FRESH device, then zeroize it (reconstructAndReadmit). The card SHAPE + handshake
 * share with the reserve; the recovery quorum IS the impersonation quorum (accepted priced/social) exactly
 * as `provisionRecoveryAtFounding` already stands — this path only re-shapes the surface into cards.
 *
 * The two guardian cards recover WITHOUT "mine" (distinct-custodian quorum); one card alone reconstructs
 * nothing (recovery-share's type wall). The root seed zeroizes the instant it is split.
 */
export async function provisionRecoveryCardsAtFounding(
  vault: PersonaVault,
  guardianA: string | null,
  guardianB: string | null,
  rng: RandomProvider,
  recoveryEpoch = 1,
  handleIndex = 0,
): Promise<RecoveryCardsAtFounding> {
  assertHandleIndex(handleIndex);
  if (!vault.recovery) {
    throw new Error("[recovery-keel-core] this vault provisions no recovery store — cannot seal a device-share");
  }
  const rootSeed = await loadPersonaRootSeed(vault, handleIndex);
  try {
    const split: GuardianCardSplit = splitToGuardianCards(rootSeed, guardianA, guardianB, recoveryEpoch, rng);
    vault.recovery.save(handleIndex, split.mineShare);   // seal the "mine" (device) share at rest
    return { cards: split.cards, mineSealed: true };
  } finally {
    rootSeed.fill(0);   // the root never lingers after the split
  }
}

// ── FORK B — THRESHOLD-ATTEST recovery (identity-classes#the-two-forks) ────────────────────────────────
// The strictest never-reconstruct: each guardian holds their OWN recovery keypair; inception pre-commits
// the k-of-n DIGEST of their recovery PUBLIC keys; a rotation carries k guardian SIGNATURES verified against
// that pre-commit. Recovery ROTATES a fresh op-key rather than resurrecting the old (the ruling, 2026-07-20).
// NOTHING reconstructs — no seed, no share, no `reconstructFromQuorum`. This path shares NOTHING with the
// Shamir/recovery-share machinery above; it is a genuine k-of-n multisig over the persona-KEL rotation.

/** The default recovery threshold — k in a k-of-n guardian quorum (2-of-3 at founding, the reserve rhyme). */
export const THRESHOLD_RECOVERY_DEFAULT = 2;

/** What a Fork-B founding provisions: the persona-KEL INCEPTION (the stable identifier prefix) + the
 *  pre-committed recovery-set digest over the guardians' recovery PUBLIC keys. NO secret splits — the
 *  guardians already hold their own recovery keypairs; the founding only COMMITS to their public set. */
export interface ThresholdRecoveryAtFounding {
  /** The persona-KEL inception event — its `prefix` IS the stable identifier the Binding-Gate pins. */
  readonly inception:       PersonaKelEvent;
  /** The pre-committed k-of-n digest of the guardians' recovery pubkeys (folded into the prefix). */
  readonly recoverySetHash: string;
  /** k — the quorum threshold committed at founding. */
  readonly recoveryThreshold: number;
}

/**
 * Provision Fork-B recovery at FOUNDING: pre-commit the guardians' recovery PUBLIC keys (their k-of-n
 * digest) and seat the persona-KEL inception over (founding op-key + that digest). The digest folds into
 * the identifier prefix, so no attacker incepts a DIFFERENT recovery set under the same identity.
 *
 * The recovery keys NEVER sign until a rotation reveals them, so a compromise of the operational present
 * cannot forge the recovery future (the independence rule — identity-classes#the-honest-edges). The three
 * guardian keys MUST sit in three domains that do not fall together (the online-identity + co-location
 * traps); this function commits the set, it does not custody the guardians' secrets (each guardian does).
 *
 * ADDITIVE / not-yet-wired: the live founding ceremony still pins the raw op-key `signerDid`; moving the
 * Binding-Gate pin to `inception.prefix` rides the SURFACED pin-move plan (identity-classes#the-continuity-anchor).
 */
export function provisionThresholdRecoveryAtFounding(input: {
  readonly foundingOpKeyDid:  string;              // "0x"+hex — the founding operational key the inception seats
  readonly guardianRecoveryKeys: readonly string[]; // the n guardian recovery PUBLIC keys (64-hex each)
  readonly recoveryThreshold?: number;             // k (default 2-of-3)
}): ThresholdRecoveryAtFounding {
  const recoveryThreshold = input.recoveryThreshold ?? THRESHOLD_RECOVERY_DEFAULT;
  if (input.guardianRecoveryKeys.length < recoveryThreshold) {
    throw new Error("[recovery-keel-core] fewer guardian recovery keys than the threshold — cannot pre-commit an unmeetable quorum");
  }
  const recoverySetHash = sealKeySetHash(input.guardianRecoveryKeys, recoveryThreshold);
  const inception       = mintPersonaInception(input.foundingOpKeyDid, recoverySetHash);
  return { inception, recoverySetHash, recoveryThreshold };
}

/** One guardian's recovery signer — its recovery PUBLIC key + a sign fn over the rotation bytes. The module
 *  holds NO guardian key; each guardian supplies its own signer (mirrors `signAntigenEntry` / wax-stamp). */
export interface GuardianRecoverySigner {
  readonly signer: string;                                   // the guardian's recovery pubkey (64-hex)
  readonly sign:   (bytes: Uint8Array) => Promise<string>;   // ed25519 sig hex over `personaRotationSigningBytes`
}

/**
 * ATTEST-AND-ROTATE — the Reading-B recovery move (identity-classes#reading-b-recovery), replacing
 * reconstruct-then-resurrect. Gather ≥ k guardian SIGNATURES over the rotation event, verify them against
 * the pre-committed recovery set, and seat a FRESH operational key via a persona-KEL rotation. The old key
 * SUPERSEDES (the head advances past it); the caller kapae-shadows its membership resurrection (evict runs
 * forward-only). NOTHING reconstructs — the guardians each sign independently; no seed or share assembles,
 * so no transient impersonation-of-the-recovery-authority window opens (the Fork-A tradeoff, closed).
 *
 * FAILS CLOSED: fewer than k valid DISTINCT-guardian signatures REFUSE; a signer outside the pre-committed
 * set does NOT count; a revealed roster whose digest misses the pre-commit REFUSES (mintPersonaRotation).
 * The `freshOpKeyDid` is the op-key the recovering vessel just minted and holds SOLELY — no quorum, no
 * guardian, no recovery root ever holds it post-rotation.
 */
export async function attestAndRotate(input: {
  readonly head:                 PersonaKelEvent;                 // the current KEL head
  readonly freshOpKeyDid:        string;                          // the fresh op-key the recovering vessel minted
  readonly guardianRecoveryKeys: readonly string[];               // the REVEALED n guardian recovery pubkeys
  readonly recoveryThreshold:    number;                          // k
  readonly guardianSigners:      readonly GuardianRecoverySigner[]; // ≥ k independent guardian signers
}): Promise<PersonaRotateResult> {
  const bytes = personaRotationSigningBytes(input.head, input.freshOpKeyDid);
  const rotationSigs: QuorumSignature[] = [];
  for (const g of input.guardianSigners) {
    rotationSigs.push({ signer: g.signer, sig: await g.sign(bytes) });
  }
  return mintPersonaRotation({
    head:              input.head,
    freshOpKeyDid:     input.freshOpKeyDid,
    recoveryRoster:    input.guardianRecoveryKeys,
    recoveryThreshold: input.recoveryThreshold,
    rotationSigs,
  });
}

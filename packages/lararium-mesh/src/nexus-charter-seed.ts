/**
 * nexus-charter-seed — the founding kahu quorum + the ROSTER-FROM-DOC read (operator-ruled 2026-07-20).
 * The `bags/@nexus` charter DOC is the AUTHORITY HOME (data-as-authority): the operator SEATS the roster
 * into that doc, and the pure `kapae-antigen` fold/verify read it back through here. This file names the
 * founding quorum's SHAPE (three PersonaGroups, 2-of-3) and folds a loaded doc into the `KahuCharterRoster`
 * the antigen consumes — FAILING CLOSED whenever the doc is absent, unseated, or short of a quorum.
 *
 * THE FOUNDING QUORUM — three founding kahu cryptographic-individuals (persona-policy: each PersonaGroup
 * a cryptographic individual), 2-of-3:
 *   · "Guru Joshua Fontany"
 *   · "Telarus, KSC"
 *   · "The Lindwyrm"
 *
 * THE DOC IS THE AUTHORITY. `foundingRoster`/`rosterFromCharterDoc` read a loaded `NexusCharterDoc`, never
 * a hardcoded key-set. Each kahu's ed25519 verifying key is that PersonaGroup's own root-derived key — the
 * operator SEATS it into the doc from the vault (`lares nexus charter seat`), never invents it here. An
 * absent doc, an unseated doc, or a doc short of `threshold` seated keys folds to an EMPTY key-set: any
 * threshold ≥ 1 fails, so the multi-sig verifier IGNORES every antigen entry. That is the correct
 * fail-closed floor — the immune system stays inert (never allow-all) until the founding quorum is
 * cryptographically real in the doc.
 *
 * Platform-blind: rides ./kapae-antigen types + ./crypto only. NO node: imports (the DISK read/write of
 * the doc lives in the node adapter `nexus-charter-doc`, which hands a parsed `NexusCharterDoc` in here).
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#the-honest-edges
 */

import type { KahuCharterRoster } from "./kapae-antigen.js";
import { sha256HexSync, canonicalJson } from "./crypto.js";
import { type CharterEpoch, verifyCharterChain, charterKeySetHash } from "./wax-stamp.js";
import { type FederationPosture, DEFAULT_FEDERATION_POSTURE } from "./federation-gate.js";
import { type CabalJoinPolicy, DEFAULT_JOIN_POLICY } from "./cabal-invite.js";
import type { AdmissionDials } from "./admission-price.js";

/** The doc kind the antigen roster trusts — a doc carrying any other kind folds to the empty (inert) roster. */
export const NEXUS_CHARTER_DOC_KIND = "lar-nexus-charter/v1" as const;

/** The charter doc's stable lar: bearing (names the doc; grants nothing — lar: NAMES, never fetches). */
export const NEXUS_CHARTER_URI = "lar:///nexus.charter.seats" as const;

/** The charter doc's uri-path — its siting inside the `bags/@nexus` residency (carrierBaseRelPath form). */
export const NEXUS_CHARTER_URI_PATH = "ha.ka.ba/nexus/charter/founding-roster" as const;

/** One founding kahu — a display name + its ed25519 verifying key (null while unseated: the fail-closed floor). */
export interface NexusCharterKahu {
  readonly displayName:  string;
  /** The PersonaGroup's ed25519 verifying-key hex (64 chars), or null while the operator has not seated it. */
  readonly verifyingKey: string | null;
}

/**
 * The APPROVED roster the antigen reads — the exact data the `bags/@nexus` charter doc carries. The node
 * adapter parses the doc off disk into this shape and hands it here; the DOC is the authority home, this
 * type its in-memory face.
 */
export interface NexusCharterDoc {
  readonly kind:            typeof NEXUS_CHARTER_DOC_KIND;
  /** k — the quorum threshold a valid antigen act carries (2-of-3 at founding). */
  readonly threshold:       number;
  /** The charter epoch the antigen roots on — the pre-rotated chain's HEAD epochCid, or null while unestablished. */
  readonly charterEpochCid: string | null;
  /**
   * The pre-rotated, hash-linked charter-epoch CHAIN (KERI): genesis at index 0, head at the end. Present
   * once `lares nexus charter seat` establishes it; a `rotate` ceremony appends. Absent on the legacy
   * genesis-inception path (the antigen then roots on `charterEpochCid` directly). A PRESENT chain MUST
   * verify AND its head MUST bind the seated key-set, or the roster reads empty (fail-closed).
   */
  readonly charterChain?:   readonly CharterEpoch[];
  /** The founding kahu, each seated (verifyingKey set) or unseated (null). */
  readonly kahu:            readonly NexusCharterKahu[];
  /**
   * The per-Nexus federation POSTURE toward FOREIGN operators (read as-of-last-sync). Absent → PRIVATE
   * (fail-closed: a Nexus develops in isolation until the operator opens it). `federationPostureFromDoc`
   * reads it. Governs cross-Nexus CARRY of the public shelf only; it never opens a private plane.
   */
  readonly federationPosture?: FederationPosture;
  /**
   * The per-Nexus STRANGER-ADMISSION dial (read as-of-last-sync). Absent → INVITE-ONLY (fail-closed: a place
   * demands signal-2 until the operator opens it). `joinPolicyFromDoc` reads it. Governs whether a STRANGER
   * must carry an invite to cross — orthogonal to `federationPosture`, which governs whether a FOREIGN
   * OPERATOR carries the public shelf. Opening one never opens the other, and neither opens a private plane.
   */
  readonly joinPolicy?:        CabalJoinPolicy;
  /**
   * The per-Nexus ADMISSION DIALS the crossing prices against — ε (the lineage reset, THE closed↔open dial),
   * β (the named this-is-capture ceiling), ρ + S (the curve's shape and supply), α (decay, from a half-life).
   *
   * DELIBERATELY WITHOUT A DEFAULT, and that is the whole point. A posture and a join-policy each have a
   * SAFE fail-closed value, so each carries one. A fairness dial has none: any number invented here would be
   * a legitimacy signal baked into code, which is exactly the unswept corner canon forbids closing silently.
   * Absent → `admissionDialsFromDoc` yields null and the crossing REFUSES, so the operator's unmade choice
   * reads as an unmade choice rather than as somebody's guess quietly enforced.
   */
  readonly admissionDials?:    AdmissionDials;
}

/** Legacy alias — one founding kahu named by display + its (unbound-until-seated) key. */
export type FoundingKahu = NexusCharterKahu;

/** The three founding kahu PersonaGroups (operator-ruled) — the SCAFFOLD names an empty charter doc seats. */
export const FOUNDING_KAHU: readonly NexusCharterKahu[] = [
  { displayName: "Guru Joshua Fontany", verifyingKey: null },
  { displayName: "Telarus, KSC",        verifyingKey: null },
  { displayName: "The Lindwyrm",        verifyingKey: null },
];

/** k — the founding threshold. 2 of the 3 founding kahu sign a valid antigen (ban/lift) act. */
export const FOUNDING_QUORUM_THRESHOLD = 2 as const;

/** A hex verifying key reads seated only at the exact ed25519 length — a stray/short value never seats. */
function isSeatedKey(key: string | null): key is string {
  return typeof key === "string" && /^[0-9a-f]{64}$/i.test(key);
}

/** The seated verifying keys a doc carries (ascending, de-duped) — the ONLY keys a quorum ever counts. */
export function seatedCharterKeys(doc: NexusCharterDoc | null): string[] {
  if (!doc || doc.kind !== NEXUS_CHARTER_DOC_KIND) return [];
  return [...new Set(doc.kahu.map((k) => k.verifyingKey).filter(isSeatedKey).map((k) => k.toLowerCase()))].sort();
}

/**
 * The GENESIS charter-epoch inception content-address — a deterministic hash BOUND to the seated key-set +
 * threshold (KERI genesis inception: the epoch IS its authorized key-set). Recomputed each seat while the
 * roster forms; at founding no antigen entry exists yet, so a re-derivation strands nothing. This is a
 * single-epoch inception, NOT the full pre-rotated wax-stamp epoch-chain (that + `lares rotate-root` is a
 * follow-on: it needs the next epoch's keys in offline custody before this epoch ever seals).
 */
export function genesisCharterEpochCid(seatedKeys: readonly string[], threshold: number): string {
  const keys = [...seatedKeys].map((k) => k.toLowerCase()).sort();
  return `epoch0-${sha256HexSync(canonicalJson({ kind: NEXUS_CHARTER_DOC_KIND, keys, threshold }))}`;
}

/**
 * Fold a loaded charter doc into the `KahuCharterRoster` the antigen verifies against. FAILS CLOSED: an
 * absent doc, a wrong-kind doc, or a doc with no established charter epoch yields an EMPTY key-set +
 * empty epoch, so the multi-sig verifier's `keys.length < threshold` and epoch-match guards both deny.
 * Only a doc carrying a real charter epoch AND seated keys raises a live roster.
 */
export function rosterFromCharterDoc(doc: NexusCharterDoc | null): KahuCharterRoster {
  const threshold = doc && Number.isInteger(doc.threshold) && doc.threshold >= 1 ? doc.threshold : FOUNDING_QUORUM_THRESHOLD;
  const keys = seatedCharterKeys(doc);
  const empty: KahuCharterRoster = { keys: [], threshold, charterEpochCid: "" };

  // Pre-rotation chain path: a present chain MUST verify its whole lineage AND its HEAD must bind the
  // seated key-set — either failure folds to the empty (inert) roster. The antigen then roots on the
  // cryptographically-verified chain HEAD, never a bare stored string.
  if (doc?.charterChain && doc.charterChain.length > 0) {
    if (!verifyCharterChain(doc.charterChain)) return empty;                        // broken lineage → deny
    const head = doc.charterChain[doc.charterChain.length - 1]!;
    if (head.keySetHash !== charterKeySetHash(keys, threshold)) return empty;       // head unbound to seated keys → deny
    return { keys, threshold, charterEpochCid: head.epochCid };
  }

  // Legacy genesis-inception path: root directly on the stored epoch cid.
  const epoch = doc && typeof doc.charterEpochCid === "string" ? doc.charterEpochCid : "";
  if (epoch.length === 0) return empty;                                             // no epoch → nothing roots → deny
  return { keys, threshold, charterEpochCid: epoch };
}

/**
 * Read the federation posture off a charter doc — FAIL CLOSED to PRIVATE. An absent doc, an absent field, or any
 * value but the exact literal `"open"` reads PRIVATE (a Nexus develops in isolation until the operator explicitly
 * opens it; a torn / unrecognized posture must never silently open the mesh). Read as-of-last-sync — no global now.
 */
export function federationPostureFromDoc(doc: NexusCharterDoc | null): FederationPosture {
  return doc?.federationPosture === "open" ? "open" : DEFAULT_FEDERATION_POSTURE;
}

/**
 * Read the stranger-admission policy off a charter doc — FAIL CLOSED to INVITE-ONLY. An absent doc, an absent
 * field, or any value but the exact literal `"open"` reads invite-only, so a torn or unrecognized dial can never
 * silently drop the invite requirement. Read as-of-last-sync — no global now.
 *
 * This puts the turn where cabal-invite says it belongs: the operator turns it, per Nexus, on the charter the
 * kahu quorum signs — never a constant the code carries. Open drops the INVITE requirement only; the crossing
 * still prices (admission-price), so `open` reads "no invite needed", never "free".
 */
export function joinPolicyFromDoc(doc: NexusCharterDoc | null): CabalJoinPolicy {
  return doc?.joinPolicy?.kind === "open" ? { kind: "open" } : DEFAULT_JOIN_POLICY;
}

/**
 * Read the admission dials off a charter doc — yielding NULL when the operator has not seated them, and
 * never a guess. Every dial must read as a finite number in its own admissible range, or the whole set reads
 * absent: a half-seated fairness setting is not a partial answer, it is a different policy nobody chose.
 *
 *   ε ∈ (0,1)  the lineage reset — high keeps trust tight to the seed, low opens it
 *   β ∈ (0,1)  the capture ceiling — the convex wall goes vertical as a cluster nears it
 *   ρ, S  > 0  the curve's shape and supply
 *   α ∈ (0,1]  decay — derived from a half-life via `alphaFromHalfLife`, never hand-picked
 *
 * A caller that gets null MUST refuse the crossing rather than substitute anything. Read as-of-last-sync.
 */
export function admissionDialsFromDoc(doc: NexusCharterDoc | null): AdmissionDials | null {
  const d = doc?.admissionDials;
  if (!d || typeof d !== "object") return null;
  const unit = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1;
  const pos  = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (!unit(d.epsilon) || !unit(d.beta)) return null;
  if (!pos(d.rho) || !pos(d.supply)) return null;
  if (!(typeof d.alpha === "number" && Number.isFinite(d.alpha) && d.alpha > 0 && d.alpha <= 1)) return null;
  // Copy the FLOOR fields alone — an extra field smuggled onto the doc never reaches the pricing.
  return { epsilon: d.epsilon, beta: d.beta, rho: d.rho, supply: d.supply, alpha: d.alpha };
}

/** The pre-rotated chain's head epoch, or null when no chain stands established (legacy / unseated doc). */
export function charterChainHead(doc: NexusCharterDoc | null): CharterEpoch | null {
  const chain = doc?.charterChain;
  return chain && chain.length > 0 ? chain[chain.length - 1]! : null;
}

/**
 * The founding `KahuCharterRoster` read from the seated charter DOC (the antigen's roster source). An
 * unseated / absent doc yields an empty roster that FAILS CLOSED (the verifier ignores every entry). This
 * repoints the founding roster onto the doc — the doc IS the authority home, evergreen.
 */
export function foundingRoster(doc: NexusCharterDoc | null): KahuCharterRoster {
  return rosterFromCharterDoc(doc);
}

/** Does the seated doc carry a live quorum? True only with an established epoch AND ≥ threshold seated keys. */
export function foundingQuorumSeated(doc: NexusCharterDoc | null): boolean {
  const r = rosterFromCharterDoc(doc);
  return r.charterEpochCid.length > 0 && r.keys.length >= r.threshold;
}

/** The UNSEATED scaffold doc — the three founding names, every key null, no epoch. The seat command's floor. */
export function emptyFoundingCharterDoc(): NexusCharterDoc {
  return {
    kind:            NEXUS_CHARTER_DOC_KIND,
    threshold:       FOUNDING_QUORUM_THRESHOLD,
    charterEpochCid: null,
    kahu:            FOUNDING_KAHU.map((k) => ({ displayName: k.displayName, verifyingKey: null })),
  };
}

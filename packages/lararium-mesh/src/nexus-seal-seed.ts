/**
 * nexus-seal-seed — the founding kahu quorum + the ROSTER-FROM-DOC read.
 *
 * ⚠ ONE WORD, SIX JOINTS — and this file holds four of them. `charter` names a FOUNDING ACT, a SEAL
 * LINEAGE (`sealLineage`), a COMPACT, a PRACTICE (`federationPosture` · `joinPolicy` ·
 * `admissionDials`), a FACE, and a ROSTER (`kahu`) — six entities separated not by content but by
 * DIFFERENT CEREMONY, THRESHOLD, RATE and AUTHORITY. A quorum that rotates keys can silently move the
 * admission price, because four amendment costs sit behind one write authority.
 *
 * THE NAMING RULING LANDED (canon `cabal-realm#six-joints`): the word retires to the FOUNDING ACT, and
 * the other joints hold their own names — `SealEpoch`/`verifySealLineage` for the lineage, `RealmGlamour`/
 * `projectRealmGlamour` for the published face, `KahuRoster` for the seats. Two joints collapsed as a gain:
 * the NAME reads as the content-address of the founding act, and the evidentiary MUNIMENT collapses whole,
 * since content-addressing makes a record self-proving natively.
 *
 * SO WHERE `charter` SURVIVES IN AN IDENTIFIER HERE, IT NAMES THE SEATS AND THE SEAL — never the published
 * face, which excludes them by definition. A reader who takes the two for one word publishes a muster roll
 * while meaning to publish a device.
 *
 * WHAT REMAINS FUSED IS AUTHORITY, NOT STORAGE. The disk doc now carries seal · kahu · practice in three
 * fenced blocks at three cadences, so no write clobbers a joint it never meant to touch. But no threshold
 * gates any of those writes, and one operator command still moves kahu and seal together — so the warning
 * above stands undischarged: four amendment costs, one hand.
 *
 * The `bags/@nexus` charter DOC carries the AUTHORITY HOME (data-as-authority): the operator SEATS the roster
 * into that doc, and the pure `kapae-antigen` fold/verify read it back through here. This file names the
 * founding quorum's SHAPE (three PersonaGroups, 2-of-3) and folds a loaded doc into the `KahuRoster`
 * the antigen consumes — FAILING CLOSED whenever the doc is absent, unseated, or short of a quorum.
 *
 * THE FOUNDING QUORUM — three founding kahu cryptographic-individuals (persona-policy: each PersonaGroup
 * a cryptographic individual), 2-of-3:
 *   · the founder's declared Handle
 *   · a second declared Handle
 *   · a third declared Handle
 *
 * THE DOC IS THE AUTHORITY. `foundingRoster`/`rosterFromNexusDoc` read a loaded `NexusDoc`, never
 * a hardcoded key-set. Each kahu's ed25519 verifying key is that PersonaGroup's own root-derived key — the
 * operator SEATS it into the doc from the vault (`lares nexus seal seat`), never invents it here. An
 * absent doc, an unseated doc, or a doc short of `threshold` seated keys folds to an EMPTY key-set: any
 * threshold ≥ 1 fails, so the multi-sig verifier IGNORES every antigen entry. That is the correct
 * fail-closed floor — the immune system stays inert (never allow-all) until the founding quorum is
 * cryptographically real in the doc.
 *
 * Platform-blind: rides ./kapae-antigen types + ./crypto only. NO node: imports (the DISK read/write of
 * the doc lives in the node adapter `nexus-doc`, which hands a parsed `NexusDoc` in here).
 * Meme: lar:///ha.ka.ba/lararium/mesh/carry-contract#the-honest-edges
 */

import { NEXUS_DOC_DOMAIN } from "./domains.js";
import type { KahuRoster } from "./kapae-antigen.js";
import { sha256HexSync, canonicalJson } from "./crypto.js";
import { type SealEpoch, verifySealLineage, sealKeySetHash } from "./wax-stamp.js";
import { type FederationPosture, DEFAULT_FEDERATION_POSTURE } from "./federation-gate.js";
import { type CabalJoinPolicy, DEFAULT_JOIN_POLICY } from "./cabal-invite.js";
import type { AdmissionDials } from "./admission-price.js";

/** The doc kind the antigen roster trusts — a doc carrying any other kind folds to the empty (inert) roster. */
export const NEXUS_DOC_KIND = NEXUS_DOC_DOMAIN;

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
export interface NexusDoc {
  readonly kind:            typeof NEXUS_DOC_KIND;
  /** k — the quorum threshold a valid antigen act carries (2-of-3 at founding). */
  readonly threshold:       number;
  /** The charter epoch the antigen roots on — the pre-rotated chain's HEAD epochCid, or null while unestablished. */
  readonly sealEpochCid: string | null;
  /**
   * The pre-rotated, hash-linked charter-epoch CHAIN (KERI): genesis at index 0, head at the end. Present
   * once `lares nexus seal seat` establishes it; a `rotate` ceremony appends. Absent on the legacy
   * genesis-inception path (the antigen then roots on `sealEpochCid` directly). A PRESENT chain MUST
   * verify AND its head MUST bind the seated key-set, or the roster reads empty (fail-closed).
   */
  readonly sealLineage?:   readonly SealEpoch[];
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

/**
 * The MAJORITY threshold over a roster of `n` — the seat's default when the operator names none.
 *
 * A quorum rule cannot come from nowhere, and it must not come from a constant either: a number written into
 * this file would seat one Nexus's fairness call inside every Nexus that ever founds. Majority reads as the
 * weakest defensible default — it refuses a single hand and refuses unanimity's hostage problem — and the seat
 * takes `--threshold` for any operator whose realm wants a different one.
 */
export function majorityThreshold(n: number): number {
  return Math.floor(n / 2) + 1;
}

/**
 * The fail-closed threshold a MALFORMED doc reads at.
 *
 * A doc that lost its threshold must not become easier to satisfy than one that kept it, so the fallback runs
 * unsatisfiably high rather than low: an empty key-set never reaches it, and the roster folds inert. A low
 * fallback here would turn a torn doc into a one-signature Nexus.
 */
export const UNREADABLE_THRESHOLD_FLOOR = Number.MAX_SAFE_INTEGER;

/** A hex verifying key reads seated only at the exact ed25519 length — a stray/short value never seats. */
function isSeatedKey(key: string | null): key is string {
  return typeof key === "string" && /^[0-9a-f]{64}$/i.test(key);
}

/** The seated verifying keys a doc carries (ascending, de-duped) — the ONLY keys a quorum ever counts. */
export function seatedKahuKeys(doc: NexusDoc | null): string[] {
  if (!doc || doc.kind !== NEXUS_DOC_KIND) return [];
  return [...new Set(doc.kahu.map((k) => k.verifyingKey).filter(isSeatedKey).map((k) => k.toLowerCase()))].sort();
}

/**
 * The GENESIS charter-epoch inception content-address — a deterministic hash BOUND to the seated key-set +
 * threshold (KERI genesis inception: the epoch IS its authorized key-set). Recomputed each seat while the
 * roster forms; at founding no antigen entry exists yet, so a re-derivation strands nothing. This is a
 * single-epoch inception, NOT the full pre-rotated wax-stamp epoch-chain (that + `lares rotate-root` is a
 * follow-on: it needs the next epoch's keys in offline custody before this epoch ever seals).
 */
export function genesisSealEpochCid(seatedKeys: readonly string[], threshold: number): string {
  const keys = [...seatedKeys].map((k) => k.toLowerCase()).sort();
  return `epoch0-${sha256HexSync(canonicalJson({ kind: NEXUS_DOC_KIND, keys, threshold }))}`;
}

/**
 * Fold a loaded charter doc into the `KahuRoster` the antigen verifies against. FAILS CLOSED: an
 * absent doc, a wrong-kind doc, or a doc with no established charter epoch yields an EMPTY key-set +
 * empty epoch, so the multi-sig verifier's `keys.length < threshold` and epoch-match guards both deny.
 * Only a doc carrying a real charter epoch AND seated keys raises a live roster.
 */
export function rosterFromNexusDoc(doc: NexusDoc | null): KahuRoster {
  const threshold = doc && Number.isInteger(doc.threshold) && doc.threshold >= 1 ? doc.threshold : UNREADABLE_THRESHOLD_FLOOR;
  const keys = seatedKahuKeys(doc);
  const empty: KahuRoster = { keys: [], threshold, sealEpochCid: "" };

  // Pre-rotation chain path: a present chain MUST verify its whole lineage AND its HEAD must bind the
  // seated key-set — either failure folds to the empty (inert) roster. The antigen then roots on the
  // cryptographically-verified chain HEAD, never a bare stored string.
  if (doc?.sealLineage && doc.sealLineage.length > 0) {
    if (!verifySealLineage(doc.sealLineage)) return empty;                        // broken lineage → deny
    const head = doc.sealLineage[doc.sealLineage.length - 1]!;
    if (head.keySetHash !== sealKeySetHash(keys, threshold)) return empty;       // head unbound to seated keys → deny
    return { keys, threshold, sealEpochCid: head.epochCid };
  }

  // Legacy genesis-inception path: root directly on the stored epoch cid.
  const epoch = doc && typeof doc.sealEpochCid === "string" ? doc.sealEpochCid : "";
  if (epoch.length === 0) return empty;                                             // no epoch → nothing roots → deny
  return { keys, threshold, sealEpochCid: epoch };
}

/**
 * Read the federation posture off a charter doc — FAIL CLOSED to PRIVATE. An absent doc, an absent field, or any
 * value but the exact literal `"open"` reads PRIVATE (a Nexus develops in isolation until the operator explicitly
 * opens it; a torn / unrecognized posture must never silently open the mesh). Read as-of-last-sync — no global now.
 */
export function federationPostureFromDoc(doc: NexusDoc | null): FederationPosture {
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
export function joinPolicyFromDoc(doc: NexusDoc | null): CabalJoinPolicy {
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
export function admissionDialsFromDoc(doc: NexusDoc | null): AdmissionDials | null {
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
export function sealLineageHead(doc: NexusDoc | null): SealEpoch | null {
  const chain = doc?.sealLineage;
  return chain && chain.length > 0 ? chain[chain.length - 1]! : null;
}

/**
 * The founding `KahuRoster` read from the seated charter DOC (the antigen's roster source). An
 * unseated / absent doc yields an empty roster that FAILS CLOSED (the verifier ignores every entry). This
 * repoints the founding roster onto the doc — the doc IS the authority home, evergreen.
 */
export function foundingRoster(doc: NexusDoc | null): KahuRoster {
  return rosterFromNexusDoc(doc);
}

/** Does the seated doc carry a live quorum? True only with an established epoch AND ≥ threshold seated keys. */
export function foundingQuorumSeated(doc: NexusDoc | null): boolean {
  const r = rosterFromNexusDoc(doc);
  return r.sealEpochCid.length > 0 && r.keys.length >= r.threshold;
}

/**
 * The UNSEATED scaffold doc — an EMPTY roster, no threshold yet, no epoch. The seat command's floor.
 *
 * IT NAMES NOBODY, and that reads as the point. A scaffold carrying names would make the SOURCE decide who
 * the founding kahu are, and a founding whose roster ships in a build is a founding the operator merely
 * confirms. The roster forms at the seat, from the personas that DECLARED a Handle and STOOD for a chair —
 * the operator's own acts, on their own vessel, which is where a legitimacy question belongs.
 *
 * `threshold: 0` reads as UNSET rather than as a satisfiable rule: no key-set reaches a live quorum through
 * this doc, so an unseated scaffold stays inert exactly as an absent one does.
 */
export function emptyFoundingCharterDoc(): NexusDoc {
  return { kind: NEXUS_DOC_KIND, threshold: 0, sealEpochCid: null, kahu: [] };
}

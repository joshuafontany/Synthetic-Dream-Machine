/**
 * cap-tier — the bag's sharing-posture as SELF-DESCRIBING DATA (operator-ruled 2026-07-21).
 *
 * A bag's cap-tier answers ONE question — WHO holds the read-cap — as a CHAIN by set-inclusion:
 *
 *     VEIL{this-vessel} ⊂ PERSONAGROUP{your-fleet} ⊂ CONTRACT{your-fleet ∪ a-cabal} ⊂ PUBLIC{world}
 *
 * Sealing-on-the-wire stays UNIVERSAL (everything leaving a vessel travels ciphertext); cleartext
 * lives ONLY inside a vessel (VEIL) or is world-readable (PUBLIC). PERSONAGROUP and CONTRACT ride
 * the SAME mechanism — keyring-delivery to a recipient set — differing only in WHICH set.
 *
 * ── ISOMORPHIC TO FederationPosture (by composition, not interface) ──────────────────────────────
 * `FederationPosture` (federation-gate.ts) models a per-Nexus stance as a self-describing datum: a
 * closed string union, a `DEFAULT_…` fail-closed constant, a `…FromDoc` parser that fail-closes on a
 * torn value, and a pure gate fn (`postureGatesCrossOperator`) that reads it. This module models the
 * cap-tier the SAME way — a closed union, `DEFAULT_CAP_TIER = "veil"` (fail-closed), `parseCapTier`
 * that fail-closes any torn value to VEIL, and a pure `resolveTier` gate. The tier only carries MORE
 * structure than a posture: a TOTAL ORDER + a `meet` (a posture is a two-valued special case).
 *
 * ── THE SAFETY KEYSTONE (the load-bearing invariant) ─────────────────────────────────────────────
 * The declared datum only DECLARES; the GATE ENFORCES `declared ∧ structural-floor` — the meet toward
 * the MORE-restrictive tier. A self-describing datum can therefore only ever self-TIGHTEN: it is
 * MECHANICALLY impossible for the quine to grant MORE openness than the crypto floor allows, because
 * `resolveTier` NEVER returns a tier more-open than its `structuralFloor` argument. The gate never
 * trusts the declared datum to loosen.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/cap-tier
 */

/**
 * CapTier — the four read-cap holder-sets, named as a TOTAL ORDER from most-restrictive to most-open.
 * The order IS the set-inclusion chain (VEIL ⊂ PERSONAGROUP ⊂ CONTRACT ⊂ PUBLIC): a lower rank names a
 * SMALLER holder-set (fewer readers → more restrictive).
 *
 *   · "veil"         — {this-vessel}. Cleartext-local; NOTHING crosses a vessel boundary in the clear.
 *   · "personagroup" — {your-fleet}. Keyring-delivered to the operator's own persona fleet.
 *   · "contract"     — {your-fleet ∪ a-cabal}. Keyring-delivered to the fleet PLUS a contracted cabal.
 *   · "public"       — {world}. World-readable (the deterministically-federatable public shelf).
 */
export type CapTier = "veil" | "personagroup" | "contract" | "public";

/**
 * The total order, ascending in OPENNESS (index = rank). VEIL(0) < PERSONAGROUP(1) < CONTRACT(2) < PUBLIC(3).
 * The array IS the order; `capTierRank` reads an index off it — no scattered magic numbers.
 */
export const CAP_TIER_ORDER: readonly CapTier[] = ["veil", "personagroup", "contract", "public"] as const;

/**
 * The fail-closed DEFAULT — a bag that declares nothing (or declares a torn value) reads VEIL: the most
 * restrictive tier, nothing crosses in the clear. Isomorphic to `DEFAULT_FEDERATION_POSTURE = "private"`.
 */
export const DEFAULT_CAP_TIER: CapTier = "veil";

/** The rank (openness index) of a tier within the total order. Lower rank → more restrictive → smaller holder-set. */
export function capTierRank(tier: CapTier): number {
  return CAP_TIER_ORDER.indexOf(tier);
}

/**
 * parseCapTier — read a self-describing tier datum, FAIL-CLOSED to VEIL. Any value but the four exact
 * literals (absent, torn, mis-cased-beyond-lowercasing, an unknown string) reads VEIL — a torn datum must
 * NEVER silently open a bag. Isomorphic to `federationPostureFromDoc` (only the exact `"open"` opens).
 */
export function parseCapTier(raw: unknown): CapTier {
  if (typeof raw !== "string") return DEFAULT_CAP_TIER;
  const v = raw.trim().toLowerCase();
  return (CAP_TIER_ORDER as readonly string[]).includes(v) ? (v as CapTier) : DEFAULT_CAP_TIER;
}

/**
 * meetCapTier — the TAINT-MEET: the MORE-restrictive (lower-rank) of two tiers. This is the ∧ the whole
 * doctrine turns on. Associative, commutative, idempotent; VEIL is the absorbing element (VEIL meets
 * anything → VEIL), PUBLIC the identity (PUBLIC meets X → X). A meet NEVER climbs: `rank(meet(a,b)) ≤
 * min(rank(a), rank(b))` — it can only descend toward restriction.
 */
export function meetCapTier(a: CapTier, b: CapTier): CapTier {
  return capTierRank(a) <= capTierRank(b) ? a : b;
}

/**
 * resolveTier — THE SAFETY KEYSTONE. The declared datum ∧ the structural floor: a bag is only ever as
 * shareable as its crypto structure permits. `declared` may only TIGHTEN below `structuralFloor`; it can
 * NEVER loosen above it, because the result is the MEET (more-restrictive) of the two.
 *
 *   resolveTier("public",       "personagroup") === "personagroup"   // declared PUBLIC, floor PERSONAGROUP → PERSONAGROUP
 *   resolveTier("veil",         "public")       === "veil"           // declared self-tightens below the floor → VEIL
 *   resolveTier("public",       "public")       === "public"         // both open → PUBLIC
 *
 * `structuralFloor` names the MOST-OPEN tier the crypto STRUCTURE permits this bag (a federatable public
 * plane → PUBLIC; a provably-sealed plane → CONTRACT; a cleartext-local plane → VEIL). The gate passes it;
 * the declared datum can only ratchet down from it. It is mechanically impossible to over-share.
 */
export function resolveTier(declared: CapTier, structuralFloor: CapTier): CapTier {
  return meetCapTier(declared, structuralFloor);
}

/**
 * refineBagTierWithTiddlers — the COMPOSABLE, TIGHTEN-ONLY per-tiddler cascade (the high-water-mark). A bag
 * is only as shareable as its LEAST-shareable tiddler: fold the bag's declared default under `meet` with
 * every per-tiddler refinement. Each refinement may only pull the result MORE-restrictive; none may loosen
 * it (a tiddler declaring PUBLIC inside a PERSONAGROUP bag leaves the bag PERSONAGROUP). The fold starts at
 * the bag default and descends.
 */
export function refineBagTierWithTiddlers(bagDefault: CapTier, tiddlerTiers: readonly CapTier[]): CapTier {
  return tiddlerTiers.reduce<CapTier>((acc, t) => meetCapTier(acc, t), bagDefault);
}

/**
 * mayDeclareTier — META-CAP ≥ declared cap. The write-cap that SETS a bag's tier datum must be at-least-as-
 * restrictive as the tier it declares: you cannot PUBLICLY-editably declare a private bag's tier (an
 * open-editable meta-cap on a VEIL bag would let the world flip the datum). In rank terms the meta-cap's
 * holder-set must be a SUBSET of the declared holder-set → `rank(metaCap) ≤ rank(declared)`.
 *
 *   mayDeclareTier("veil",   "public") === false   // world-editable datum on a private bag → DENY
 *   mayDeclareTier("public", "public") === true    // world-editable datum on a public bag → OK
 *   mayDeclareTier("public", "veil")   === true    // a tighter meta-cap on an open bag → OK
 */
export function mayDeclareTier(declared: CapTier, metaCapTier: CapTier): boolean {
  return capTierRank(metaCapTier) <= capTierRank(declared);
}

/**
 * mayDeclassify — DECLASSIFICATION (loosening) is an explicit OPERATOR-ROOT act, never content-derived
 * (robust declassification). Moving a bag's tier toward MORE openness (`rank(to) > rank(from)`) REQUIRES the
 * operator-root capability; TIGHTENING (`rank(to) ≤ rank(from)`) needs no special act — a bag may always
 * self-tighten (the keystone), so a tightening cascade never asks the operator.
 *
 * ── ONE-WAY RATCHET under no-global-now ──────────────────────────────────────────────────────────
 * This gates a FUTURE declaration only. It cannot un-federate the PAST: bytes already carried to a holder-
 * set under a looser tier stay carried (a causal island cannot reach back across another's log). So a
 * declassification widens who reads NEW writes; a re-tightening never recalls what already crossed.
 */
export function mayDeclassify(from: CapTier, to: CapTier, isOperatorRoot: boolean): boolean {
  if (capTierRank(to) <= capTierRank(from)) return true;   // tighten (or no-op) → always allowed, no operator act
  return isOperatorRoot;                                    // loosen → operator-root only (robust declassification)
}

/**
 * TierFloorOracle — WHERE the structural floor comes from on a real bag. The floor names the MOST-OPEN tier
 * the crypto structure permits, read off the SAME oracles the carry-split already consults:
 *   · a doc in the deterministically-federatable public set → PUBLIC (a stranger reads it foreign-legible).
 *   · a provably-sealed plane (ciphertext a carrier cannot read) → CONTRACT (the fleet∪cabal member-carry
 *     ceiling; a PERSONAGROUP refinement rides ATOP as a declared tightening — the wire shore cannot itself
 *     split fleet from cabal, so CONTRACT is the honest structural ceiling of the sealed lane).
 *   · everything else — a cleartext-local plane → VEIL (nothing crosses in the clear).
 *
 * FAIL-CLOSED: absent both oracles, the floor reads VEIL — the correct restriction floor while no sealed
 * plane type stands. Isomorphic in spirit to `federationPostureFromDoc`'s fail-closed read.
 */
export interface TierFloorOracle {
  /** True → the doc rides the deterministically-federatable PUBLIC shelf (world-readable). */
  isPublicPlane(documentId: string): boolean;
  /** True → the doc's bytes are provably ciphertext a carrier cannot read (the sealed member-carry lane). */
  isSealedPlane(documentId: string): boolean;
  /**
   * True → the doc holds SECRETS whose whole value rests on staying unpublished, so no reading of any other
   * oracle may raise it past CONTRACT. A reach credential (a foreign app secret the vessel holds so a human
   * posts outward from their wiki) is the first such store; the name stays general because the property does
   * — any store whose bytes stop meaning anything the moment they go world-readable belongs here.
   *
   * OPTIONAL for compatibility: an oracle that omits it behaves exactly as before.
   */
  isContractSecretsPlane?(documentId: string): boolean;
}

/**
 * structuralFloorFor — fold the floor oracles into the tier ceiling for one doc.
 *
 * ── ORDER CARRIES THE WHOLE GUARANTEE ────────────────────────────────────────────────────────────
 * The contract-secrets reading runs FIRST, ahead of PUBLIC. Placed anywhere later it never fires, because
 * a public reading would already have returned. That ordering is what makes a secrets plane structurally
 * unpublishable rather than merely unregistered: the keystone meets every declaration against this floor,
 * so a secrets bag declaring PUBLIC meets straight back down to CONTRACT. Publishing a credential becomes
 * IMPOSSIBLE, not forbidden — and a guard that holds only because nobody registered the plane as public
 * would be protection by omission, which reads identically to no protection at all.
 *
 * CONTRACT rather than PERSONAGROUP, deliberately: a credential several people legitimately share (one
 * character voiced by a cabal) needs the cabal inside the read-cap set. A personal secret then DECLARES
 * PERSONAGROUP or VEIL to tighten — the direction a declaration is always allowed to move.
 *
 * The remaining order stands as before: PUBLIC wins over SEALED (a plane both federatable-public AND sealed
 * reads PUBLIC — its ciphertext still names a world-readable shelf entry); a sealed-but-not-public plane
 * reads CONTRACT; none of them reads VEIL. A null oracle → VEIL.
 */
export function structuralFloorFor(oracle: TierFloorOracle | null, documentId: string): CapTier {
  if (!oracle) return "veil";
  if (oracle.isContractSecretsPlane?.(documentId)) return "contract";
  if (oracle.isPublicPlane(documentId)) return "public";
  if (oracle.isSealedPlane(documentId)) return "contract";
  return "veil";
}

/**
 * makeTierFloorOracle — the ONE door that assembles a floor oracle, so no site hand-rolls one.
 *
 * WHY A CONSTRUCTOR RATHER THAN AN OBJECT LITERAL. `isContractSecretsPlane` rides OPTIONAL so every oracle
 * written before it keeps working unchanged — which is right for compatibility and wrong for authorship: a
 * new site writing its own literal omits the secrets reading silently, and the omission reads exactly like
 * a site that had no secrets plane to declare. A hand-written enumeration cannot notice what it missed.
 * Assembling through here makes each reading a NAMED argument, so leaving one out becomes a visible act.
 *
 * FAIL-CLOSED per reading: an absent predicate answers false for every doc, which floors toward VEIL rather
 * than away from it. Passing nothing at all yields an oracle that reads VEIL for everything.
 */
export function makeTierFloorOracle(readings: {
  /** The doc rides the deterministically-federatable PUBLIC shelf. */
  readonly federatable?: (documentId: string) => boolean;
  /** The doc's bytes are provably ciphertext a carrier cannot read. */
  readonly sealed?: (documentId: string) => boolean;
  /** The doc holds secrets whose value rests on staying unpublished — floors at CONTRACT, read FIRST. */
  readonly secrets?: (documentId: string) => boolean;
}): TierFloorOracle {
  const { federatable, sealed, secrets } = readings;
  return {
    isPublicPlane:          (d) => federatable?.(d) ?? false,
    isSealedPlane:          (d) => sealed?.(d) ?? false,
    isContractSecretsPlane: (d) => secrets?.(d) ?? false,
  };
}

/**
 * DeclaredTierSource — the self-describing datum READER: resolve a doc → its DECLARED cap-tier (the bag
 * default already refined by its per-tiddler cascade), or null when the bag carries NO tier datum at all
 * (opts out of refinement → the floor governs, no tightening). A doc whose datum is PRESENT but torn reads
 * VEIL via `parseCapTier` INSIDE this source — the null here means "no datum", never "torn datum".
 */
export interface DeclaredTierSource {
  /** The declared (bag-default ∧ tiddler-cascade) tier for a doc, or null when the bag declares no tier. */
  declaredTierForDoc(documentId: string): CapTier | null;
}

/**
 * CapTierRing — the SHORE the gate consults: a declared-tier source ∧ a structural-floor oracle. Pure and
 * deny-by-default at the edges. `resolveTierForDoc` is the keystone applied per-doc: `resolveTier(declared
 * ?? floor, floor)` — a null declaration degenerates to the floor (no tightening), a present declaration can
 * only tighten below it.
 */
export interface CapTierRing {
  readonly declared: DeclaredTierSource;
  readonly floor:    TierFloorOracle;
}

/**
 * resolveTierForDoc — the per-doc keystone the gate reads. When the bag declares no tier (source → null),
 * the floor governs unchanged (the tier layer stays INERT for that doc). When it declares one, the meet
 * tightens — never loosens — below the floor.
 */
export function resolveTierForDoc(ring: CapTierRing, documentId: string): CapTier {
  const floor    = structuralFloorFor(ring.floor, documentId);
  const declared = ring.declared.declaredTierForDoc(documentId);
  return resolveTier(declared ?? floor, floor);
}

/**
 * tierPermitsRelayPeer — does a RESOLVED tier let THIS relay peer hold the read-cap? The pure share-shore
 * translation of the holder-set chain:
 *   · PUBLIC                 → any relay peer (the world holds the read-cap).
 *   · CONTRACT / PERSONAGROUP → a MEMBER peer only (the fleet∪cabal / fleet holder-set; the wire shore
 *                               cannot split fleet from cabal, so both member-tiers read "member peer").
 *   · VEIL                    → NO relay peer (nothing crosses a vessel boundary in the clear).
 *
 * This is a pure TIGHTENING predicate: the gate ANDs it with the structural verdict, and because the
 * resolved tier is ≤ the structural floor, it can only ever ADD a deny, never an allow.
 */
export function tierPermitsRelayPeer(resolved: CapTier, holdsCarriagePeer: boolean): boolean {
  switch (resolved) {
    case "public":       return true;
    case "contract":     return holdsCarriagePeer;
    case "personagroup": return holdsCarriagePeer;
    case "veil":         return false;
  }
}

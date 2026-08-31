/**
 * nexus-identity — the scope a SHARED plane resolves under.
 *
 * PRIOR ART: this is a KERI Autonomic Identifier. An AID is "cryptographically derived from its very
 * first key event, called an inception event", and that event "MUST include the list of controlling
 * public keys and a signature threshold" — the same inputs `genesisSealEpochCid` hashes. The charter
 * chain already cites KERI for pre-rotation; the identifier it mints at genesis is the island's name.
 *
 * ── A NEXUS HOLDS NO KEY, SO NO VESSEL'S KEY NAMES IT ───────────────────────────────────────────
 * Three boards derive their address from one parameter spelled `nexusPubkey`, and each is documented
 * as per-island: "every island member resolves the one board with no mint-race". Passing a vessel's
 * own key satisfies that within one operator's fleet and splits the island across two contracted
 * operators, because each resolves a board only it can see.
 *
 * Choosing some operator's key instead would make the others read a vessel where they meant to read
 * their shared island. The island needs a name that belongs to none of them.
 *
 * ── THE GENESIS EPOCH IS THAT NAME ──────────────────────────────────────────────────────────────
 * `genesisSealEpochCid` content-addresses the seated key-set and the threshold, so every vessel
 * holding the charter derives the same value from public material, it names no vessel, and it
 * survives rotation because the genesis sits at the HEAD of the lineage rather than at its end.
 *
 * ── AND SHARING IS SAFE ONLY WHERE IT CANNOT WIDEN ──────────────────────────────────────────────
 * A shared scope belongs to a plane whose contents cannot enlarge a vessel's own authority:
 *   · WHO board       — carries no write-ACL, and a handle-card is valid only if signed by its own
 *                       nym, so an openly-appendable board stays forgery-proof and reading grants
 *                       nothing.
 *   · antigen (DENY)  — quorum-signed against the charter roster, and an entry whose signature does
 *                       not verify is ignored. A foreign ban can only TIGHTEN this vessel.
 *   · members (ALLOW) — REFUSED, and this module is not for it. Those admits are unsigned local acts
 *                       that only WIDEN: folding a partner's would let their future admits conscript
 *                       this vessel into carriage it never consented to.
 * The asymmetry carries the rule — a deny may be shared, an allow may not. It is the anti-flickering
 * property of a deny list: once disallowed, never allowed again, so the set is MONOTONE and replicates
 * without total consistency. An allow set has no such property — it widens, and widening it from
 * elsewhere is how a partner conscripts a vessel. Independently: CRDTs cannot enforce global
 * invariants, and a roster of who belongs IS one.
 */

/** `epoch0-` plus 64 hex — the shape `genesisSealEpochCid` mints. Anything else names no island. */
const GENESIS_RE = /^epoch0-[0-9a-f]{64}$/;

export interface NexusIdentity {
  /** The value a shared plane addresses its board under. */
  readonly scope:   string;
  /** Whether that scope is an island shared with other operators, or this vessel standing alone. */
  readonly shared:  boolean;
  /** Whose island this is, so a caller never reads a private board as the shared one. */
  readonly reading: string;
}

/**
 * The island scope this vessel resolves shared planes under.
 *
 * An unreadable genesis is REFUSED rather than addressed: a board keyed by garbage mints cleanly and
 * stays empty, so the vessel would read a quiet private island as though it were the shared one — a
 * split that reports as agreement.
 */
export function nexusIdentity(
  at: { genesisEpochCid?: string | null; ownVesselKey: string },
): NexusIdentity {
  const own     = at.ownVesselKey.trim().toLowerCase();
  const genesis = (at.genesisEpochCid ?? "").trim().toLowerCase();

  if (genesis.length === 0) {
    return { scope: own, shared: false,
             reading: "this vessel holds no seated charter, so it stands as its OWN ISLAND and resolves its "
                    + "shared planes under its own key. Nothing is wrong here — a vessel alone is a Nexus of "
                    + "one, and the scope widens when a charter seats." };
  }
  if (!GENESIS_RE.test(genesis)) {
    return { scope: own, shared: false,
             reading: "this charter's genesis epoch is unreadable, so it names no island and this vessel falls "
                    + "back to its own key. Addressing a board by a malformed scope would mint a clean empty "
                    + "one that no peer resolves, and a private island reads exactly like an agreeing one." };
  }
  return { scope: genesis, shared: true,
           reading: `this vessel resolves the island named by its charter's genesis epoch (${genesis.slice(0, 18)}…), `
                  + "which every vessel holding that charter derives alike and which belongs to no operator. "
                  + "Shared planes only: a board that could WIDEN this vessel's authority stays its own." };
}

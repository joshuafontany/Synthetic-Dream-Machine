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
 * ── AN ANCHOR NAMES ITS CONFEDERATION; A PEER RELATION HAS NO ANCHOR ────────────────────────────
 * A browser vessel is a LEAF-NODE lararium — a herm carrying operator/user CRDT caps — and it already
 * resolves `explicit ?? the gate key it dials ?? its own DID`, because "a node anchors its
 * confederation, so its gate key IS the Nexus key its leaves pass back". Composing a shared plane
 * under a FOREIGN key is therefore a witnessed shape, not a new one.
 *
 * That model covers a fleet and stops at a peer relation: when two sovereign operators contract,
 * neither dials the other, so neither gate key names their island. The charter does.
 *
 * ── AND A CHARTER CANNOT OUTRANK AN ANCHOR WHERE IT CANNOT EXIST ────────────────────────────────
 * A charter term ahead of an anchor term looks like it could move a leaf off the board its anchor
 * stands. It cannot, and the reason is structural rather than chosen: seating a charter, contracting
 * an operator, accepting carriage and flipping a posture all reach the SEAL HOME on disk, and a leaf
 * has none. A leaf supplies an anchor and no genesis, so the anchor term wins by construction — the
 * ordering only ever decides for a vessel that could hold both, which is a vessel that keeps a hearth.
 *
 * That is the operator/user seam in one line: an operator KEEPS a hearth and may declare where it
 * stands; a user WALKS the road and is told which shrine they arrived at. The household lararium
 * answers to its operator; the crossroads answers to whoever walks the road.
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
 *   · members (SHARED) — a stamp is a public contract into the Cabal, quorum-countersigned, so the
 *                       board records who stamped in. The record shares; the DECISION does not. Whether
 *                       this vessel carries for a given member is its own reading OVER that record, and
 *                       fusing the two is what would conscript it — an admit only ever WIDENS whom a
 *                       vessel carries for, and an operator consents at ONE epoch. ⚠ A stamp must be
 *                       signed by the PUBLIC HANDLE: a PersonaGroup root on a shared board correlates
 *                       one human's memberships by a key that also names their device-group.
 * The asymmetry carries the rule — a deny may be shared, an allow wants a fresh consent. A deny list
 * carries the anti-flickering property: once disallowed, never allowed again, so the set is MONOTONE and
 * replicates without total consistency. An allow set has no such property. Independently: CRDTs cannot
 * enforce global invariants, and a roster of who belongs IS one.
 *
 * ⚠ AND THE FIELD DISPUTES THE COMFORT IN THAT. Shared moderation lists are measured to carry no
 * selection criteria, to be binary, to grow only, and to make inclusion effectively permanent — a
 * ratchet that cannot un-ratchet is safe to ADD to and impossible to correct. They also sever third
 * parties who never joined the operator's threat model, and a widely-imported list becomes the global
 * registry the architecture removed. Sharing a deny wants EXPIRY, PROVENANCE, and defined MERGE
 * semantics; a quorum signature answers forgery and never legitimacy.
 */

/** `epoch0-` plus 64 hex — the shape `genesisSealEpochCid` mints. Anything else names no island. */
const GENESIS_RE = /^epoch0-[0-9a-f]{64}$/;

/** A gate key names an island only as hex — anything else addresses a board no peer resolves. */
const KEY_RE = /^[0-9a-f]{16,64}$/;

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
  at: {
    /** An island this caller already knows — never second-guessed. */
    explicitScope?:  string | null;
    /** The genesis epoch of a charter this vessel holds — a relation it CONSENTED to. */
    genesisEpochCid?: string | null;
    /** The gate key of an anchor this vessel dials — a relay it happens to reach. */
    anchorGateKey?:  string | null;
    ownVesselKey:    string;
  },
): NexusIdentity {
  const own      = at.ownVesselKey.trim().toLowerCase();
  const explicit = (at.explicitScope ?? "").trim().toLowerCase();
  const genesis  = (at.genesisEpochCid ?? "").trim().toLowerCase();
  const anchor   = (at.anchorGateKey ?? "").trim().toLowerCase();

  if (explicit.length > 0) {
    return { scope: explicit, shared: explicit !== own,
             reading: "this caller named its island outright, so nothing here infers one. A vessel that "
                    + "knows which Nexus it is composing for is the most reliable source there is." };
  }
  if (genesis.length > 0 && GENESIS_RE.test(genesis)) {
    return { scope: genesis, shared: true,
             reading: `this vessel holds a charter, so its island is the genesis epoch that charter names `
                    + `(${genesis.slice(0, 18)}…) — derived alike by every holder and belonging to no operator. `
                    + "A charter OUTRANKS an anchor: it names a relation this vessel consented to, where an "
                    + "anchor names only a relay it reaches." };
  }
  if (genesis.length > 0) {
    return { scope: own, shared: false,
             reading: "this charter's genesis epoch is unreadable, so it names no island and this vessel falls "
                    + "back to its own key. Addressing a board by a malformed scope would mint a clean empty "
                    + "one that no peer resolves, and a private island reads exactly like an agreeing one." };
  }
  if (anchor.length > 0 && KEY_RE.test(anchor)) {
    return { scope: anchor, shared: anchor !== own,
             reading: "this vessel holds no charter and dials an anchor, so it joins the island it crosses "
                    + "into: an anchor names its confederation by its gate key, and a leaf passes that key "
                    + "back to resolve the one board its anchor stands." };
  }
  if (anchor.length > 0) {
    return { scope: own, shared: false,
             reading: "the anchor key this vessel dials reads as no key at all, so it names no island and this "
                    + "vessel falls back to its own. A board addressed by a malformed scope mints clean and "
                    + "empty, and a vessel alone on one cannot tell that from agreement." };
  }
  return { scope: own, shared: false,
           reading: "this vessel holds no charter and dials no anchor, so it stands as its OWN ISLAND and "
                  + "resolves its shared planes under its own key. Nothing is wrong here — a vessel alone is "
                  + "a Nexus of one, and the scope widens when a charter seats or an anchor is dialled." };
}

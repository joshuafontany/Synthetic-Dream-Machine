/**
 * Causal Island primitives — ontological law and protocol types.
 *
 * Ontological basis (Fuller-Zelenka):
 *   Events in Universe are not simultaneously apprehended by any observer.
 *   A node never holds the full state of a distributed system "at once" —
 *   it holds a snapshot of what it has synchronized so far.
 *   This topology defines the system — not a limitation it suffers.
 *
 * Simultaneously apprehended: your local Automerge doc snapshot, right now.
 * Non-simultaneously apprehended: everything else —
 *   - other peers syncing the same doc (you see their state at last sync)
 *   - other Automerge Realms reachable from this one on the network
 *   - tiddlers not yet hydrated in the local TW5 instance
 *   - kumu/active-meme instances whose event horizon is their own
 *
 * Law: Any boundary across which causality cannot be guaranteed simultaneously
 *      marks a causal island boundary.
 *
 * Four tiers (inner → outer):
 *   Tier 0 — active memes (kumu/UEFN device instances): MAY become islands —
 *            they own their own event horizon, params, and trigger surface.
 *            promotion is optional; correction is local.
 *   Tier 1 — memes inside a wiki (within your Automerge doc window):
 *            simultaneously apprehended, but peer state of same doc is not.
 *   Tier 2 — Automerge Realms: other Automerge docs reachable from this one,
 *            no matter where first encountered. Always non-simultaneous.
 *   Tier 3 — Lares nodes (federation layer): node-to-node edge islands.
 *            A pranala connection between nodes constitutes a causal island. MUST.
 */

// ---------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------

export interface LarPrincipalDid      { readonly kind: "did";            readonly id: string; }
export interface LarPrincipalEd25519  { readonly kind: "ed25519";        readonly publicKey: string; }
export interface LarPrincipalLocal    { readonly kind: "local-operator"; readonly alias: string; readonly tier?: string; readonly host?: string; }

export type LarPrincipal =
  | LarPrincipalDid
  | LarPrincipalEd25519
  | LarPrincipalLocal;

// ---------------------------------------------------------------------------
// Ability Ladder
//
// Ordered from least to most privileged.
// EXCEPTION: pull does NOT imply read. A relay holds pull without read.
// All other abilities imply every ability below them in the ladder.
// ---------------------------------------------------------------------------

// Schema: lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands
export const ABILITY_LADDER = [
  "pull",     // retrieve encrypted bytes and forward; cannot decrypt or render
  "read",     // decrypt and render semantic content
  "sync",     // participate in CRDT reconciliation
  "write",    // produce accepted mutations
  "propose",  // suggest hostful changes (pending; not yet hostless canon)
  "promote",  // hostful → hostless canon-promotion ceremony
  "admin",    // manage wiki, recipe, edge island membership
  "revoke",   // roll epoch; terminate future live tail for a principal
] as const;

export type OrichalcumAbility = typeof ABILITY_LADDER[number];

/**
 * Returns true if holding `have` implies holding `need`.
 *
 * Relay-law exception: pull does NOT imply read.
 * A shrine relay carries offerings it cannot understand.
 */
export function abilityImplies(have: OrichalcumAbility, need: OrichalcumAbility): boolean {
  if (have === need) return true;
  // pull only implies itself — relay-law exception
  if (have === "pull") return false;
  const haveIdx = ABILITY_LADDER.indexOf(have);
  const needIdx = ABILITY_LADDER.indexOf(need);
  return haveIdx >= needIdx;
}

// ---------------------------------------------------------------------------
// Caveats — Lararium-native predicates evaluated at gate time
//
// A capability with no caveats is maximally permissive within its ability scope.
// Stage band is NOT a capability gate condition (UX annotation only).
// ---------------------------------------------------------------------------

export interface CaveatRatingAtLeast { readonly kind: "rating-at-least";  readonly rating: string; }
export interface CaveatManaoioAtLeast { readonly kind: "manaoio-at-least"; readonly threshold: number; }
export interface CaveatWikiRecipe    { readonly kind: "wiki-recipe";       readonly recipeUri: string; }
export interface CaveatKapuScope     { readonly kind: "kapu-scope";        readonly scope: "personal" | "consensual" | "collective" | "universal"; }
export interface CaveatHostBoundary  { readonly kind: "host-boundary";     readonly value: "hostless-only" | "hostful-ok"; }
export interface CaveatEdgeIsland    { readonly kind: "edge-island";       readonly edgeId: string; }
export interface CaveatEpoch         { readonly kind: "epoch";             readonly epoch: string; }

export type OrichalcumCaveat =
  | CaveatRatingAtLeast
  | CaveatManaoioAtLeast
  | CaveatWikiRecipe
  | CaveatKapuScope
  | CaveatHostBoundary
  | CaveatEdgeIsland
  | CaveatEpoch;

// ---------------------------------------------------------------------------
// Capability
// ---------------------------------------------------------------------------

export interface OrichalcumCapability {
  readonly issuer:    LarPrincipal;
  readonly audience:  LarPrincipal;
  /** lar:/// canonical URI or edge: island id */
  readonly resource:  string;
  readonly abilities: readonly OrichalcumAbility[];
  readonly caveats:   readonly OrichalcumCaveat[];
}

/** True if the capability grants the requested ability (respects pull≠read). */
export function capabilityHasAbility(cap: OrichalcumCapability, need: OrichalcumAbility): boolean {
  return cap.abilities.some((a) => abilityImplies(a, need));
}

// ---------------------------------------------------------------------------
// Edge Island Identity
// ---------------------------------------------------------------------------

/** Branded ID: "edge:${sourceNode}:${targetNode}:${epoch}" */
export type EdgeIslandId = `edge:${string}`;

export function makeEdgeIslandId(
  sourceNode: string,
  targetNode: string,
  epoch: string,
): EdgeIslandId {
  return `edge:${sourceNode}:${targetNode}:${epoch}`;
}

// ---------------------------------------------------------------------------
// Edge Island Lifecycle
//
// stable sediment | current boot receipt | live delta tail
//
// Revocation is forward-only. Past sediment encrypted at prior epoch keys
// remains readable by those who held those keys.
// ---------------------------------------------------------------------------

export type EdgeIslandLifecycle =
  | "boot-receipt"   // join snapshot issued; peer authorized to see visible world
  | "live-tail"      // receiving delta stream from last known offset
  | "sediment"       // historical compacted state; no longer receiving deltas
  | "revoked";       // epoch rolled; no future live-tail frames for this principal

// ---------------------------------------------------------------------------
// Edge Island Shape (Tier 3 — node-to-node federation boundary)
//
// Every edge island MUST carry these fields.
// The offset belongs to the edge island — NOT to the remote node.
// An edge island that reconnects resumes from its last known offset.
// Peer-sync-state (Tier 1/2) is always non-simultaneously apprehended;
// the edge island functions as the named, capability-gated record of that horizon.
// ---------------------------------------------------------------------------

export interface EdgeIslandShape {
  readonly id:          EdgeIslandId;
  readonly capability:  OrichalcumCapability;
  /** Monotonic frame count — belongs to the edge island, not the remote node. */
  readonly offset:      number;
  /** Revocation generation; rolling epoch terminates prior live-tail access. */
  readonly epoch:       string;
  readonly lifecycle:   EdgeIslandLifecycle;
  /**
   * Hash-stable receipt — updated after join, after each epoch change, after
   * each canon-promotion ceremony. Usable as a prompt cache key.
   */
  readonly receipt:     string | null;
}

// ---------------------------------------------------------------------------
// Visibility Gate
//
// A meme passes the federation gate when ALL conditions hold.
// Stage band functions as a UX annotation — NOT a gate condition here.
// Wiki recipes MAY filter by stage as operator configuration.
// ---------------------------------------------------------------------------

export interface VisibilityGateInput {
  /** Structural rating of the meme carrier (noise | data | meme | ano | kapu). */
  memeRating:      string;
  /** Community-weighted believability Level [0–20]. */
  memeManaoio:     number;
  /** Wiki's minimum manaoio threshold. */
  wikiMinManaoio:  number;
  /** Whether the wiki recipe matches this meme (operator-configured predicate). */
  recipeMatches:   boolean;
  /** Whether the subject holds the "sync" ability on this edge island. */
  subjectCanSync:  boolean;
  /** Whether the edge island's epoch has been revoked. */
  edgeRevoked:     boolean;
  /** Whether the meme violates a kapu constraint for this subject. */
  violatesKapu:    boolean;
}

/** Ratings that are structurally eligible to federate. Noise and Data are node-local only. */
const FEDERABLE_RATINGS = new Set(["meme", "ano", "kapu"]);

/**
 * Federation visibility gate — ALL conditions must hold.
 *
 *   rating(meme)    >= Meme
 *   manaoio(meme)   >= wiki.minManaoio
 *   recipe(wiki).matches(meme)
 *   hasAbility(subject, "sync", edge.id)
 *   !edge.revoked
 *   !violatesKapu(meme, subject)
 */
export function visibilityGate(input: VisibilityGateInput): boolean {
  if (!FEDERABLE_RATINGS.has(input.memeRating.toLowerCase())) return false;
  if (input.memeManaoio < input.wikiMinManaoio)                return false;
  if (!input.recipeMatches)                                    return false;
  if (!input.subjectCanSync)                                   return false;
  if (input.edgeRevoked)                                       return false;
  if (input.violatesKapu)                                      return false;
  return true;
}

// ---------------------------------------------------------------------------
// Authority-First Sync Order
//
// Content MUST NOT precede authority. This invariant has no exceptions.
//
//   1. authenticate peer / node / device
//   2. sync Orichalcum authority graph (membership, capabilities, delegations, revocations)
//   3. derive visible wiki recipe + visible causal islands
//   4. sync collection manifest (wikis, memes, edge islands, receipts)
//   5. per-island: a) capability/epoch ops  b) CRDT heads  c) delta payloads  d) receipts
//
// A relay that has not completed step 2 MUST NOT receive step 4 or later.
// A peer that has not completed step 3 MUST NOT request individual meme deltas.
// ---------------------------------------------------------------------------

// Schema: lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands
export const AUTHORITY_FIRST_ORDER = [
  "authenticate-peer",         // 1
  "sync-authority-graph",      // 2
  "derive-visible-wikis",      // 3
  "sync-collection-manifest",  // 4
  "capability-epoch-ops",      // 5a
  "sync-crdt-heads",           // 5b
  "sync-delta-payloads",       // 5c
  "sync-projection-receipts",  // 5d
] as const;

export type AuthorityFirstStep = typeof AUTHORITY_FIRST_ORDER[number];

export type AuthorityFirstState =
  | "authenticating"     // step 1 — peer not verified
  | "syncing-authority"  // step 2 — Orichalcum graph not yet reconciled
  | "syncing-manifest"   // steps 3–4 — wikis/memes/islands deriving
  | "live";              // steps 5+ — delta stream active

/**
 * Per-connection state machine enforcing authority-first sync ordering.
 *
 * Gate failures at join (steps 1–3) close the connection.
 * Gate failures at delta receipt (step 4) drop the frame and log a receipt violation.
 */
export class AuthorityFirstGuard {
  private _state: AuthorityFirstState = "authenticating";

  get state(): AuthorityFirstState { return this._state; }

  /** True if content (manifests, receipts) may flow. False until step 4 begins. */
  get contentAllowed(): boolean {
    return this._state === "syncing-manifest" || this._state === "live";
  }

  /** True if delta payloads may flow. False until after manifest sync. */
  get deltaAllowed(): boolean {
    return this._state === "live";
  }

  /** Returns true if the guard permits proceeding with the given step. */
  canProceed(step: AuthorityFirstStep): boolean {
    switch (step) {
      case "authenticate-peer":
        return true;
      case "sync-authority-graph":
        return this._state !== "authenticating";
      case "derive-visible-wikis":
      case "sync-collection-manifest":
        return this._state === "syncing-manifest" || this._state === "live";
      case "capability-epoch-ops":
      case "sync-crdt-heads":
      case "sync-delta-payloads":
      case "sync-projection-receipts":
        return this._state === "live";
      default:
        return false;
    }
  }

  /** Advance the guard after completing a step. */
  advance(step: AuthorityFirstStep): void {
    switch (step) {
      case "authenticate-peer":
        if (this._state === "authenticating") this._state = "syncing-authority";
        break;
      case "sync-authority-graph":
        if (this._state === "syncing-authority") this._state = "syncing-manifest";
        break;
      case "sync-collection-manifest":
        if (this._state === "syncing-manifest") this._state = "live";
        break;
      default:
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Causal Island Doctrine — MAY vs MUST
// ---------------------------------------------------------------------------

/**
 * Things that MUST become causal islands (cross-node causality errors become
 * federation corruption and cannot be corrected inside a single node).
 */
// Schema: lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands
export const CAUSAL_ISLAND_MUST = [
  "node-to-node-federation-edge",
  "cross-node-pranala-connection",
  "canon-promotion-ceremony",
  "revocation-epoch-change",
  "encrypted-sync-membership-change",
  "live-hostful-record-proposing-hostless-canon-mutation",
] as const;

export type CausalIslandMust = typeof CAUSAL_ISLAND_MUST[number];

/**
 * Things that MAY become causal islands (local causality errors can be
 * corrected inside a node; promotion to causal island is optional).
 *
 * Tier 0 candidates (active programming memes) are prime for island promotion:
 * a kumu instance, kahea invocation, or UEFN device analogue has its own
 * trigger surface, params, and event horizon — making it a natural island.
 *
 * "automerge-realm" and "peer-sync-state" are always non-simultaneously
 * apprehended (Fuller-Zelenka); they are listed here to make the doctrine
 * explicit even though they aren't promoted by ceremony — they qualify as islands
 * by topology.
 */
// Schema: lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands
export const CAUSAL_ISLAND_MAY = [
  "wiki",
  "meme",
  "sigil",
  "kumu-instance",
  "kahea-invocation",
  "local-wiki-projection",
  "long-lived-runtime-actor",
  "automerge-realm",
  "peer-sync-state",
] as const;

export type CausalIslandMay = typeof CAUSAL_ISLAND_MAY[number];

// ---------------------------------------------------------------------------
// PromotionReceipt — cross-island promotion ceremony record
//
// Emitted when a draft tiddler moves from the local/session layer to a durable
// corpus or wiki island.  Receipts prevent cross-island mutation from becoming
// hidden atomicity.  A promotion without a receipt becomes shadow canon.
//
// Capability gate: the actor MUST hold at least "promote" in ABILITY_LADDER.
// Use abilityImplies(actor.ability, "promote") before accepting.
//
// Meme: lar:///ha.ka.ba/@lares/v0.1/api/lararium/schema/promotion-receipt
// ---------------------------------------------------------------------------

export interface PromotionReceipt {
  /** The draft tiddler title being promoted. */
  readonly sourceDraftId: string;
  /** Target tiddler title in the destination island (may differ from draft id). */
  readonly targetId: string;
  /** Bag ID of the destination island (e.g. wikiDraftLarUri(slug), or a corpus bag URI). */
  readonly targetBag: string;
  /** Automerge doc head(s) of the destination island before the promotion write. */
  readonly beforeHeads: readonly string[];
  /** Automerge doc head(s) of the destination island after the promotion write. */
  readonly afterHeads: readonly string[];
  /** Principal performing the promotion — must hold "promote" ability. */
  readonly actor: LarPrincipal;
  /** ISO 8601 timestamp of the ceremony. */
  readonly promotedAt: string;
  /**
   * Projection ids invalidated by this promotion.
   * Projection consumers must recompute any listed id after receiving this receipt.
   */
  readonly invalidatesProjections: readonly string[];
}

// ---------------------------------------------------------------------------
// requestKeyhivePromotion — stub (Keyhive WASM promotion graph not yet wired)
// ---------------------------------------------------------------------------

export interface KeyhivePromotionRequest {
  readonly fromUri:      string;
  readonly targetUri:    string;
  readonly wikiId:       string;
  readonly proposedText: string;
  readonly reason?:      string;
}

export type KeyhivePromotionResult =
  | { readonly ok: true;  readonly receiptUri: string }
  | { readonly ok: false; readonly status: "not-implemented"; readonly reason: string };

/**
 * Stub: returns not-implemented until the Keyhive promotion graph is wired.
 * Sentinel test in causal-island.test.ts guards this boundary.
 */
export async function requestKeyhivePromotion(
  _req: KeyhivePromotionRequest,
): Promise<KeyhivePromotionResult> {
  return {
    ok: false,
    status: "not-implemented",
    reason: "keyhive-promotion-graph-not-wired",
  };
}

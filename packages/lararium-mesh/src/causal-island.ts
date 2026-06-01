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

import { ADMIN_BAG_ID } from "./lar-uris.js";

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
// Access axis — Axis 1 of the refined authority model
//
// Schema: lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands
//
// The authority model has THREE structural axes plus one alignment plane
// (refined 2026-06-01 against Frazee "Practical Decentralization" + prior-art
// research). This file owns the per-bag ACCESS axis and the edge-island
// federation scaffolding. The other dimensions live elsewhere:
//
//   Axis 1 — ACCESS   (this ladder) — monotonic, cryptographic, per bag.
//   Axis 2 — SCALE    — Keyhive group nesting (PersonGroup ⊂ Cabal ⊂ … ⊂ DreamNet).
//   Axis 3 — POWERS   — separation of host/relay/aggregate/address/moderate;
//                       lar:/// host-independent addressing is the lever.
//   Plane 0 — ALIGNMENT — non-monotonic, subjective trust (the "lemures" plane).
//                       lar:///ha.ka.ba/@lares/v0.1/api/pono/alignment-layer
//
// The ACCESS axis is a 1:1 mirror of Keyhive's native Access enum (Pull, Read,
// Edit, Admin) — NOT a parallel Lararium-invented ladder. The live gate is
// `CapabilityVerifier.verify({ access: "read" | "admin" })` (capability.ts);
// this ordered tuple gives the edge-island federation scaffolding a typed
// vocabulary for the same four levels, with the relay-law exception.
//
// EXCEPTION (relay-law): pull does NOT imply read. A relay holds pull and
// forwards ENCRYPTED bytes it cannot decrypt or render. All other levels imply
// every level below them.
//
// Retired rungs (do not reintroduce without a live consumer + canon update):
//   "promote" (2026-05-31) — canon-promotion ceremony gone; residency-model
//      bag-priority cascade subsumes it (write to a lower-priority bag = admin).
//   "propose" (2026-05-31) — no consumer; residency ACTION verbs gate on admin.
//   "sync"    (2026-06-01) — not a rung. Sync = pull-at-infrastructure-scale
//      (forward ciphertext bidirectionally). Edge eligibility rides the
//      `subjectCanSync` gate boolean, derived from pull/read on the edge.
//   "revoke"  (2026-06-01) — not a rung. Revocation = an ADMIN operation
//      (roll the epoch). Carried structurally by EdgeIslandShape.epoch +
//      the "revoked" lifecycle state, not a privilege level above admin.
// Verbs ARE Keyhive's native Access verbs (Pull/Read/Edit/Admin) — lexical, not
// just structural, mirror. `Access.tryFromString` accepts these strings; our
// live gate `CapabilityAccess` (capability.ts) is the {read, admin} subset the
// KeyhiveProvider delegates today. Use `edit`, not a coined `write`.
export const ABILITY_LADDER = [
  "pull",     // forward encrypted bytes; cannot decrypt or render (Keyhive Pull)
  "read",     // decrypt and render semantic content (Keyhive Read)
  "edit",     // produce accepted mutations (Keyhive Edit)
  "admin",    // manage membership, recipe, epoch/revocation, residency actions (Keyhive Admin)
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
   * each residency ACTION verb invocation. Usable as a prompt cache key.
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
  "cross-bag-residency-action",
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
 * explicit even though no ceremony moves them — they qualify as islands
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
// PromotionReceipt + requestKeyhivePromotion retired 2026-05-31 under the
// residency-model cleanup. The replacement audit-trail layer is EffectRecord
// (packages/lararium-mesh/src/effect-record.ts) — per-bag tagged with one of
// ARCHIVAL_VERBS (accession / deaccession / transfer / withdrawal / loan /
// holdings / reappraisal / disposition). Effect records live IN the bags they
// describe and travel with bag CRDT history; they do not need a centralized
// receipt registry. Keyhive integration for residency ACTION verbs (when it
// lands) will get a fresh stub-or-real handler family in @lararium/keyhive.
// ---------------------------------------------------------------------------

// ===========================================================================
// Residency model — relocated from bag-residency.ts on 2026-06-01 (EPIC S11.1).
//
// Operator ruling: the causal-island code hosts residency; the standalone
// side-file (older than the causal-islands model) is retired. The thermal+pin
// reshape (hot/warm/cold + orthogonal pin-flag) lands in S11.2; this block is a
// behavior-preserving move.
//
// NOTE: 'ResidencyTier' here is the RESIDENCY tier (pinned/hot/cold), DISTINCT
// from the ontological causal-island Tier 0-3 in this file's header doctrine.
// Canon: lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-tiers
// ===========================================================================
/** A bag's URL — Automerge doc URL, e.g. "automerge:abc123…". */
export type BagUrl = string;

/**
 * Residency TEMPERATURE of a single bag — the thermal axis (S11.2 reshape).
 *
 * Canon: lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-tiers
 *
 *   hot   — live + reacting; handle in cache.
 *   warm  — quiesced but handle RETAINED; cheap re-warm by signal (no spawn).
 *   cold  — handle dropped; URL known, doc not loaded; re-warm by spawn + `ea`.
 *
 * `pinned` is NOT a temperature — it is an ORTHOGONAL flag ("exempt from
 * cooling"). See `isPinned()`. A pinned bag still has a temperature (hot).
 *
 * Transition VERBS wear Hawaiian (the-lararium-hud.md doctrine):
 *   - `hoʻoanu` ("to cool") — hot → warm → cold. `IslandMsg_HooAnu` drives the
 *     island side; `cool()` drives this bookkeeping side.
 *   - `hoʻomahana` ("to warm") — cold → warm → hot. `touch()` warms a bag back;
 *     the `IslandMsg_HooMahana` worker signal (S11.3) wires the
 *     pause-without-terminate resume mechanism.
 */
export type ResidencyTemperature = "hot" | "warm" | "cold";

/**
 * A bag's residency derives from the islands whose recipes reference it:
 * the **warmest** referencing island wins (hot > warm > cold). No referencing
 * island → cold. This is the collapse rule (EPIC S11.4): bags do not carry an
 * independent tier; their temperature is computed from island residency.
 */
export function deriveBagTemperature(
  islandTemps: readonly ResidencyTemperature[],
): ResidencyTemperature {
  if (islandTemps.includes("hot"))  return "hot";
  if (islandTemps.includes("warm")) return "warm";
  return "cold";
}

/**
 * @deprecated Pre-collapse tier vocabulary (`pinned`/`hot`/`cold`). The model
 * split into an orthogonal temperature axis + pin flag on 2026-06-01. New code
 * uses `ResidencyTemperature` + `isPinned()`. Retained only as a transitional
 * type alias; remove once no external reference remains.
 */
export type ResidencyTier = ResidencyTemperature | "pinned";

/**
 * ChunkStore — storage abstraction shaped to match Beelay's Sedimentree
 * format when that ships. Today's only impl wraps Automerge-repo's
 * StorageAdapter. The `compact()` hook stays a no-op until a Sedimentree-
 * aware backend lands.
 *
 * Keys use Automerge's tuple convention: [docId, "snapshot"|"incremental",
 * chunkId]. Values are opaque binary blobs.
 */
export interface ChunkStore {
  load(key: readonly string[]): Promise<Uint8Array | undefined>;
  save(key: readonly string[], data: Uint8Array): Promise<void>;
  remove(key: readonly string[]): Promise<void>;
  loadRange(prefix: readonly string[]): Promise<{ key: readonly string[]; data: Uint8Array }[]>;
  removeRange(prefix: readonly string[]): Promise<void>;
  /** Sedimentree compaction hook — Phase 2; today's impls may no-op. */
  compact?(docId: string): Promise<void>;
}

/** Snapshot of one bag's residency record. */
export interface BagResidencyEntry {
  readonly url:          BagUrl;
  readonly temperature:  ResidencyTemperature;
  readonly pinned:       boolean;  // orthogonal flag — exempt from cooling
  readonly lastTouched:  number;   // ms epoch
  readonly pinReason?:   string;   // operator-supplied or system pin reason
  readonly syncActive?:  boolean;  // true when peers are mid-replication
}

/** Stats summary for `lares residency` instrumentation. */
export interface BagResidencyStats {
  readonly pinned:    readonly BagUrl[];
  readonly hot:       readonly BagResidencyEntry[];
  readonly warm:      readonly BagResidencyEntry[];
  readonly coldCount: number;
  readonly hotCap:    number;
}

export interface BagResidencyManagerOptions {
  /** Soft cap on RESIDENT (hot + warm) bag count. Default 32. Pinned bags are
   *  exempt and do not count against the cap. */
  readonly hotCap?:     number;
  /** Idle threshold in ms. Hot bags untouched longer than this cool to warm;
   *  warm bags untouched longer than 2×idleMs cool to cold. Default 300_000. */
  readonly idleMs?:     number;
  /** Sweeper tick interval in ms. Default 30_000 (30 seconds). */
  readonly sweepIntervalMs?: number;
  /** Hook called when transitioning cold → hot (hoʻomahana warm-up). Wires
   *  into Automerge's repo.find(). */
  readonly onHydrate?:  (url: BagUrl) => Promise<void>;
  /** Hook called when transitioning to cold (hoʻoanu deep-cool). Compact-then-
   *  drop; until automerge-repo#358 lands a public eviction API the actual
   *  handle drop stays a TODO inside the hook impl. */
  readonly onEvict?:    (url: BagUrl) => Promise<void>;
  /** Hook called when transitioning hot → warm (hoʻoanu quiesce). The handle is
   *  RETAINED; S11.3 wires Worker suspend-without-terminate here. */
  readonly onSuspend?:  (url: BagUrl) => Promise<void>;
}

/** Internal per-bag residency state (single-map model). */
interface ResidencyState {
  temperature: ResidencyTemperature;
  pinned:      boolean;
  lastTouched: number;
  pinReason?:  string;
  syncActive?: boolean;
}

/**
 * BagResidencyManager — owns the residency state for one vessel's bags.
 *
 * Single-map model (S11.2): every known bag carries a `ResidencyState`
 * (temperature + orthogonal pin flag). Temperature moves hot ↔ warm ↔ cold
 * via touch/cool; pin is set independently and exempts a bag from cooling.
 *
 * NOTE: this is the bag-level bookkeeping mechanism the Island Pool drives
 * (EPIC S11 collapse). Bag temperature ultimately DERIVES from the warmest
 * referencing island (`deriveBagTemperature`); this manager records and bounds
 * that derived state plus the LRU/idle sweeper that frees handles.
 */
export class BagResidencyManager {
  private readonly _bags = new Map<BagUrl, ResidencyState>();
  private readonly hotCap:          number;
  private readonly idleMs:          number;
  private readonly sweepIntervalMs: number;
  private readonly onHydrate?:      (url: BagUrl) => Promise<void>;
  private readonly onEvict?:        (url: BagUrl) => Promise<void>;
  private readonly onSuspend?:      (url: BagUrl) => Promise<void>;
  // ReturnType<typeof setInterval> resolves to DOM's `number` here because
  // @types/node isn't on the lararium-mesh type chain. The runtime value
  // is Node's Timeout. clearInterval accepts both; only Node has .unref().
  private sweeperTimer:             ReturnType<typeof setInterval> | null = null;
  private sweepInFlight = false;

  constructor(opts: BagResidencyManagerOptions = {}) {
    this.hotCap          = opts.hotCap          ?? 32;
    this.idleMs          = opts.idleMs          ?? 300_000;
    this.sweepIntervalMs = opts.sweepIntervalMs ?? 30_000;
    if (opts.onHydrate) this.onHydrate = opts.onHydrate;
    if (opts.onEvict)   this.onEvict   = opts.onEvict;
    if (opts.onSuspend) this.onSuspend = opts.onSuspend;
  }

  private _ensure(url: BagUrl): ResidencyState {
    let s = this._bags.get(url);
    if (!s) {
      s = { temperature: "cold", pinned: false, lastTouched: Date.now() };
      this._bags.set(url, s);
    }
    return s;
  }

  private _entry(url: BagUrl, s: ResidencyState): BagResidencyEntry {
    return {
      url,
      temperature: s.temperature,
      pinned:      s.pinned,
      lastTouched: s.lastTouched,
      ...(s.pinReason  !== undefined && { pinReason:  s.pinReason  }),
      ...(s.syncActive !== undefined && { syncActive: s.syncActive }),
    };
  }

  /** Pin a bag — exempt it from cooling (orthogonal flag). A cold bag warms
   *  to hot (hydrate); a hot/warm bag stays resident and gains the flag. */
  async pin(url: BagUrl, reason?: string): Promise<void> {
    const wasCold = (this._bags.get(url)?.temperature ?? "cold") === "cold";
    const s = this._ensure(url);
    s.pinned = true;
    if (reason !== undefined) s.pinReason = reason;
    if (wasCold) {
      s.temperature = "hot";
      s.lastTouched = Date.now();
      if (this.onHydrate) await this.onHydrate(url);
    }
  }

  /** Clear the pin flag. Temperature is unchanged — the doc still lives in RAM
   *  (hot/warm); it simply becomes a cooling candidate again. */
  unpin(url: BagUrl): void {
    const s = this._bags.get(url);
    if (!s || !s.pinned) return;
    s.pinned = false;
    delete s.pinReason;
  }

  /** Note that a bag was just touched (read or write) — `hoʻomahana` to hot.
   *  Warms cold/warm → hot via onHydrate (cold only); bumps lastTouched.
   *  Triggers an LRU trim when adding pushes resident count past hotCap. */
  async touch(url: BagUrl): Promise<void> {
    const wasCold = (this._bags.get(url)?.temperature ?? "cold") === "cold";
    const s = this._ensure(url);
    if (wasCold && this.onHydrate) await this.onHydrate(url);
    s.temperature = "hot";
    s.lastTouched = Date.now();
    await this.enforceCap();
  }

  /** Register a URL we know about but haven't loaded. Oracle traversal calls
   *  this when it sees a `tiddler.text → automerge:URL` pointer for a bag not
   *  already tracked. No-op if already known (never demotes a live bag). */
  registerCold(url: BagUrl): void {
    if (this._bags.has(url)) return;
    this._bags.set(url, { temperature: "cold", pinned: false, lastTouched: Date.now() });
  }

  /** `hoʻoanu` — cool a bag toward `target`. Refuses pinned bags.
   *
   *  → warm: only from hot. Handle RETAINED; calls onSuspend (island quiesce).
   *  → cold: from hot or warm. Refuses mid-sync (automerge-repo#358 invariant);
   *          calls onEvict (compact-then-drop). Drops the handle.
   *
   *  Returns true when the temperature moved. */
  async cool(url: BagUrl, target: "warm" | "cold"): Promise<boolean> {
    const s = this._bags.get(url);
    if (!s || s.pinned) return false;
    if (s.temperature === target) return false;
    if (target === "cold") {
      if (s.syncActive) return false;       // #358 — don't drop mid-replication
      if (this.onEvict) await this.onEvict(url);
      s.temperature = "cold";
      delete s.syncActive;
      return true;
    }
    // target === "warm" — only a step down from hot (cold→warm is a warm-up)
    if (s.temperature !== "hot") return false;
    if (this.onSuspend) await this.onSuspend(url);
    s.temperature = "warm";
    return true;
  }

  /** Backward-compatible alias — `evict` == cool to cold (handle drop). */
  async evict(url: BagUrl): Promise<boolean> {
    return this.cool(url, "cold");
  }

  /** Count of UNPINNED resident (hot + warm) bags. Pinned bags are exempt from
   *  cooling and do NOT count against the cap (preserves pre-collapse semantics
   *  where `_hot` excluded pinned). The cap bounds this number. */
  private residentCount(): number {
    let n = 0;
    for (const s of this._bags.values()) if (!s.pinned && s.temperature !== "cold") n++;
    return n;
  }

  /** LRU trim — while resident > hotCap, cool the oldest evictable bag to cold.
   *  Prefers warm victims over hot (warm is already a cooling candidate). */
  private async enforceCap(): Promise<void> {
    while (this.residentCount() > this.hotCap) {
      const target = this._oldestOf("warm") ?? this._oldestOf("hot");
      if (!target) break;        // every resident bag is pinned or mid-sync
      const ok = await this.cool(target, "cold");
      if (!ok) break;            // race or refusal — bail; next sweep retries
    }
  }

  /** Oldest unpinned, non-syncing bag at the given temperature, or null. */
  private _oldestOf(temp: ResidencyTemperature): BagUrl | null {
    let oldestUrl: BagUrl | null = null;
    let oldestAt  = Infinity;
    for (const [url, s] of this._bags) {
      if (s.pinned || s.syncActive || s.temperature !== temp) continue;
      if (s.lastTouched < oldestAt) {
        oldestAt  = s.lastTouched;
        oldestUrl = url;
      }
    }
    return oldestUrl;
  }

  /** Start the background sweeper. Idempotent — calling twice is a no-op. */
  startSweeper(): void {
    if (this.sweeperTimer) return;
    this.sweeperTimer = setInterval(() => {
      void this.sweepOnce().catch((err) => {
        console.error("[residency] sweep crashed:", err);
      });
    }, this.sweepIntervalMs);
    // Don't keep the Node event loop alive just for this. Cast through
    // unknown — DOM's setInterval-return-type lacks .unref() but the
    // runtime value (Node's Timeout) carries it.
    (this.sweeperTimer as unknown as { unref?: () => void }).unref?.();
  }

  /** Stop the sweeper; safe to call multiple times. */
  stopSweeper(): void {
    if (!this.sweeperTimer) return;
    clearInterval(this.sweeperTimer);
    this.sweeperTimer = null;
  }

  /** One sweep pass (two-stage idle cooling, then cap enforcement):
   *    1. hot  idle > idleMs    → warm   (quiesce, handle retained)
   *    2. warm idle > 2×idleMs  → cold   (compact-then-drop)
   *    3. resident > hotCap     → cold   (LRU trim)
   *  Re-entrancy-guarded so overlapping ticks don't fight. */
  async sweepOnce(): Promise<{ warmed: number; cooled: number; lruEvicted: number }> {
    if (this.sweepInFlight) return { warmed: 0, cooled: 0, lruEvicted: 0 };
    this.sweepInFlight = true;
    let warmed = 0, cooled = 0, lruEvicted = 0;
    try {
      const now        = Date.now();
      const warmCutoff = now - this.idleMs;       // hot  → warm
      const coldCutoff = now - this.idleMs * 2;   // warm → cold (deeper idle)
      // Stage 1 — idle hot cools to warm.
      const toWarm: BagUrl[] = [];
      for (const [url, s] of this._bags)
        if (!s.pinned && !s.syncActive && s.temperature === "hot" && s.lastTouched < warmCutoff)
          toWarm.push(url);
      for (const url of toWarm) if (await this.cool(url, "warm")) warmed++;
      // Stage 2 — deeper-idle warm cools to cold.
      const toCold: BagUrl[] = [];
      for (const [url, s] of this._bags)
        if (!s.pinned && !s.syncActive && s.temperature === "warm" && s.lastTouched < coldCutoff)
          toCold.push(url);
      for (const url of toCold) if (await this.cool(url, "cold")) cooled++;
      // Stage 3 — enforce the resident cap.
      const before = this.residentCount();
      await this.enforceCap();
      lruEvicted = before - this.residentCount();
    } finally {
      this.sweepInFlight = false;
    }
    return { warmed, cooled, lruEvicted };
  }

  /** Mark or unmark a bag as mid-sync. The sweeper + cool() consult this
   *  before dropping a handle (the automerge-repo#358 invariant: "don't evict
   *  while another vessel is actively replicating to us"). No-op if unknown. */
  setSyncActive(url: BagUrl, active: boolean): void {
    const s = this._bags.get(url);
    if (!s) return;
    s.syncActive = active;
  }

  has(url: BagUrl): boolean {
    return this._bags.has(url);
  }

  /** Temperature of a bag, or null if unknown. NOTE: returns the thermal tier
   *  only — use `isPinned()` for the orthogonal pin flag. */
  tier(url: BagUrl): ResidencyTemperature | null {
    return this._bags.get(url)?.temperature ?? null;
  }

  /** The orthogonal pin flag — true if this bag is exempt from cooling. */
  isPinned(url: BagUrl): boolean {
    return this._bags.get(url)?.pinned ?? false;
  }

  pinned(): readonly BagUrl[] {
    const out: BagUrl[] = [];
    for (const [url, s] of this._bags) if (s.pinned) out.push(url);
    return out;
  }

  /** Hot entries sorted by lastTouched DESC (most-recent first). */
  hot(): readonly BagResidencyEntry[] {
    return this._entriesAt("hot").sort((a, b) => b.lastTouched - a.lastTouched);
  }

  /** Warm entries sorted by lastTouched DESC. */
  warm(): readonly BagResidencyEntry[] {
    return this._entriesAt("warm").sort((a, b) => b.lastTouched - a.lastTouched);
  }

  cold(): readonly BagUrl[] {
    const out: BagUrl[] = [];
    for (const [url, s] of this._bags) if (s.temperature === "cold") out.push(url);
    return out;
  }

  // Reports UNPINNED entries at a temperature — stats buckets (pinned / hot /
  // warm / cold) stay disjoint, so a pinned-hot bag appears only under pinned().
  private _entriesAt(temp: ResidencyTemperature): BagResidencyEntry[] {
    const out: BagResidencyEntry[] = [];
    for (const [url, s] of this._bags)
      if (!s.pinned && s.temperature === temp) out.push(this._entry(url, s));
    return out;
  }

  stats(): BagResidencyStats {
    return {
      pinned:    this.pinned(),
      hot:       this.hot(),
      warm:      this.warm(),
      coldCount: this.cold().length,
      hotCap:    this.hotCap,
    };
  }
}

// ---------------------------------------------------------------------------
// Pin tiddler shape — pins persist as tiddlers in the admin doc.
// Same pattern as bag-mirror configs (S5.6 A.5). The dispatcher's residency
// manager reads pin tiddlers at boot and applies them.
// ---------------------------------------------------------------------------

/** Build the URI for a pin tiddler under the admin doc. */
export function pinTiddlerUri(bagUrl: BagUrl): string {
  return `${ADMIN_BAG_ID}/pin/${encodeURIComponent(bagUrl)}`;
}

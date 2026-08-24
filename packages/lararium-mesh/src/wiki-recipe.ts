/**
 * wiki-recipe — one-model recipe spec for every wiki.
 *
 * Slot order = cascade order. Top of stack wins (TW5 cascade law). The live
 * "above the fold" layers are PER-WIKI (each rooted at the wiki's own identity),
 * never global singletons — the address names the wiki (see wikiSlotUri):
 *
 *   wikis/{slug}/temp     — volatile, in-memory, $:/temp/* lives here
 *   wikis/{slug}/draft    — "Draft of …" tiddlers, CRDT, high-churn (unsaved)
 *   wikis/{slug}/personal — operator cross-device viewing state ($:/StoryList,
 *                            $:/state/folded/*, $:/state/tab-*), CRDT. The doc a
 *                            slot binds to is keyed per (PersonaGroup × recipe-
 *                            fingerprint) by the vessel resolver; the slot URI carries
 *                            the address, the resolver hands over the per-fingerprint doc.
 *   wikis/{slug}/working  — the SAVED live write layer, CRDT; normal edits route here
 *   bags/{slug}           — the wiki's CANON bag (read-only from the wiki), published
 *                            to only by a promotion MOVE (shore-law)
 *   libraryBags[]          — optional content libraries, CRDT, read-only from wiki
 *                            (the lares wiki-recipe carries the lararium and lares bags here)
 *   oracle                 — runtime system island: engine core + plugins + grammar +
 *                            bag-oracle; the UNIVERSAL FLOOR of every recipe, CRDT, required
 *
 * The lares bag (personality) and the lararium bag (engine corpus) never stand as the floor — they
 * ride a wiki's libraryBags. The lares wiki-recipe = oracle floor + lararium bag + lares bag.
 * The memetic-wikitext plugin rides the oracle island (CID-frozen), so it is universal.
 *
 * Above-stack projections defer (separate concern). When they land they will
 * subscribe to nalu events, not participate in the cascade.
 *
 * Schema: lar:///ha.ka.ba/lares/api/lararium/wiki-recipe
 */

import type { AutomergeUrl } from "@automerge/automerge-repo";
import type { Heads } from "@automerge/automerge";
import type { LarTiddlerRecord } from "./tiddler-store.js";
import { ORACLE_DOC_URI, LARARIUM_DOC_URI, LARES_DOC_URI, CROSSROADS_DOC_URI, bagUri, wikiUri } from "./lar-uris.js";

/** A slot URI in the lar:///ha.ka.ba/{bags,wikis}/@<name> namespace. */
export type SlotUri = string;

/**
 * The live "above the fold" layers a wiki #has — each rooted at the wiki's
 * IDENTITY (`wikis/{slug}`), never its canon bag. The binding is per-wiki
 * (PersonaGroup × recipe-fingerprint); the URI now names the wiki too, so which
 * wiki a layer belongs to reads from its address.
 *
 *   wikis/{slug}/temp     — volatile, in-memory, $:/temp/* lives here
 *   wikis/{slug}/draft    — "Draft of …" tiddlers, CRDT, high-churn (unsaved)
 *   wikis/{slug}/working  — the SAVED live write layer, CRDT; normal edits route
 *                            here, canon publishes on a promotion MOVE (shore-law)
 *   wikis/{slug}/personal — operator cross-device viewing state ($:/StoryList,
 *                            $:/state/folded/*), CRDT
 */
export type WikiSlotKind = "temp" | "draft" | "working" | "personal";

/** Mint a per-wiki live slot URI (`wikis/{slug}/{kind}`). The one source both
 *  `expandRecipe` (island cascade) and `recipeHostFacets` (host projection) walk,
 *  so host and island name identical layers. */
export function wikiSlotUri(slug: string, kind: WikiSlotKind): SlotUri {
  return `${wikiUri(slug)}/${kind}`;
}

export const LARES_BAG    = LARES_DOC_URI;
export const LARARIUM_BAG = LARARIUM_DOC_URI;
/** oracle — the runtime system island; the universal floor of every recipe. */
export const ORACLE_BAG   = ORACLE_DOC_URI;
/** crossroads — the public oracle plane; a recipe library bag whose pointer the oracle plane serves (public infra). */
export const CROSSROADS_BAG = CROSSROADS_DOC_URI;

/** Build a wiki's CANON BAG URI from a slug (`bags/{slug}`) — the published,
 *  promotion-target content plane, read-only from the wiki. MUST agree with the
 *  doc consts (DAEMON_BAG_ID etc), which the daemon's composite mount and its
 *  event-store put both key on. */
export function wikiBagUri(slug: string): SlotUri {
  return bagUri(slug) as SlotUri;
}

/** The per-wiki draft layer (`wikis/{slug}/draft`) — above the fold, the live
 *  edit plane, never the canon bag. */
export function wikiDraftBagUri(slug: string): SlotUri {
  return wikiSlotUri(slug, "draft");
}

/** The catalog registry key for a per-DID draft doc (`wikis/{slug}/drafts/{did}`) — the
 *  per-operator draft-doc pointer, above the fold. ONE source for the host reader
 *  (recipeHostFacets) and the mint/draft writers, so the round-trip never drifts. */
export function wikiDraftDocKey(slug: string, identityDid: string): SlotUri {
  return `${wikiUri(slug)}/drafts/${encodeURIComponent(identityDid)}`;
}

/**
 * The host-side facets of a wiki, projected from its slug — the SAME minters
 * `expandRecipe` walks, so the VM-free host composite and the island cascade name
 * identical bags. This REPLACES the bespoke `planActiveWikiSlot`: one slug, one
 * set of slot minters, every context (node vessel, browser vessel, future) flows
 * through it (the isomorphic core — a wiki recipe is a nameless-entity #has-cap-stack).
 */
export interface WikiHostFacets {
  readonly wikiSlug: string;
  /** IDENTITY — `wikis/{slug}`, the catalog registry key for the wiki itself. */
  readonly wikiKey: string;
  /** CANON — `bags/{slug}`, the write/canon content doc the host resolves + registers. */
  readonly wikiBagId: string;
  /** The per-wiki draft layer bagId (`wikis/{slug}/draft`). */
  readonly draftBagId: string;
  /** The catalog registry key for THIS operator's per-DID draft doc (`wikis/{slug}/drafts/{did}`). */
  readonly draftOracleTitle: string;
}

/** Project a wiki's host-side facets from its slug + the operator's DID. */
export function recipeHostFacets(wikiSlug: string, identityDid: string): WikiHostFacets {
  return {
    wikiSlug,
    wikiKey:          wikiUri(wikiSlug),
    wikiBagId:        wikiBagUri(wikiSlug),
    draftBagId:       wikiSlotUri(wikiSlug, "draft"),
    draftOracleTitle: wikiDraftDocKey(wikiSlug, identityDid),
  };
}

/**
 * Extract the slug from a lar URI of the form `lar:///ha.ka.ba/bags/<slug>`.
 * Falls back to the input string for malformed inputs (callers can detect
 * by comparing input === slugFromUri(input) — true means malformed).
 */
export function slugFromUri(uri: string): string {
  // IT READS WHAT `wikiUri` AND `bagUri` MINT. Both spell the kind-plane segment — `wikis/slug`,
  // `bags/slug` — so a pattern demanding a bare `@` at the root matches nothing either one produces, and
  // every real address falls through to the malformed arm below and returns whole where a caller expects a
  // bare slug. The segment is optional here because a wiki id also travels as the bare slug itself.
  const match = /^lar:\/\/\/ha\.ka\.ba\/(?:bags\/|wikis\/)?@([^/]+)/.exec(uri);
  return match ? match[1]! : uri;
}

/**
 * WikiRecipe — the one shape that fits every wiki under the sun.
 *
 *   daemonRecipe: { wikiSlug: "daemon" }
 *   sdmRecipe:   { wikiSlug: "synthetic-dream-machine",
 *                  libraryBags: ["lar:///ha.ka.ba/bags/sdm", "lar:///ha.ka.ba/bags/ftls"] }
 */
export interface WikiRecipe {
  /** Identity slug; expands to lar:///ha.ka.ba/bags/<wikiSlug>. */
  readonly wikiSlug: string;
  /**
   * Canon content bag URIs, ordered top→bottom within the canon slot —
   * libraryBags[0] wins ties over libraryBags[1]. Read-only from this wiki.
   */
  readonly libraryBags?: readonly SlotUri[];
  /**
   * Canon bag URIs this wiki DESIGNATES for local disk projection (write-back).
   * A synced, platform-neutral *wish* (the shape half of disk-mirroring). The
   * island materializes a mirror for a designated bag IFF it also holds the
   * disk-write capability — a node pool's construction grant (`diskMirrorGrant`);
   * a browser leaf holds none and silently ignores the designation. The list
   * alone grants nothing: the unforgeable authority lives in the held grant,
   * never in this recipe (a plaintext flag any peer could write must not confer
   * authority — OCAP "don't separate designation from authority").
   */
  readonly mirrorBags?: readonly SlotUri[];
  /**
   * Optional bag PINS — Anti-pattern #5 defense (recipe-drift poisoning).
   * Each pinned slot carries an Automerge Heads array naming the expected state.
   * When a slot carries a pin, `CompositeStore.auditPins(recipe)` reports
   * the drift state per bag; `resolveAllRespectingPins(recipe, title)` skips
   * drifted bags from the read path. Default reads (`resolveAll` / `get` /
   * `resolveTopmost`) stay unaffected — opt-in by call site.
   * Default null/absent = unpinned.
   */
  readonly bagPins?: ReadonlyMap<SlotUri, Heads>;

  /**
   * Optional read-time lenses keyed by `meta.schemaVersion` — Anti-pattern #2
   * defense (schema drift across multi-bag residency). Cambria-style projection
   * from a record's stored schema-version into the consumer's expected shape.
   *
   * **Why version-keyed, not bag-keyed:**
   * Per-bag keys duplicate the same lens across bags that share a schema
   * generation. Cambria's settled model keys lenses by `(sourceVersion,
   * targetVersion)`. A flat `Map<sourceVersion, RecordLens>`
   * suffices — each entry projects from `sourceVersion` to the recipe's
   * single current consumer shape. Promote to `Map<[fromV, toV], RecordLens>`
   * shortest-path resolution only when ≥3 concurrent versions live.
   *
   * `lensFor(recipe, record)` reads `record.meta?.schemaVersion`; absent or
   * unrecognized version falls back to identityLens.
   */
  readonly lenses?: ReadonlyMap<string, RecordLens>;
}

/**
 * Read-time lens function — Anti-pattern #2 defense (schema drift across
 * multi-bag residency). Cambria-style read-projection from a record's stored
 * shape into the consumer's expected shape. One-way only (read-projection,
 * not bidirectional writeback) — bidirectionality stays a research project
 * per the Cambria literature; this surface stays honest to one-way.
 *
 * Signature: (record) => record. Pure function; no IO.
 */
export type RecordLens = (record: LarTiddlerRecord) => LarTiddlerRecord;

/** Identity lens — default when no version-keyed lens registers. */
export const identityLens: RecordLens = (record) => record;

/**
 * Return the lens function that SHOULD apply to a record read.
 *
 * Reads `record.meta?.schemaVersion` and looks up `recipe.lenses?.get(version)`.
 * Falls back to identityLens when:
 *   - the record carries no schemaVersion (legacy / unmigrated content)
 *   - the recipe registers no lens for the record's version
 *   - the recipe has no lenses map at all
 *
 * Anti-pattern #2 defense: read-time lensing, not write-time migration.
 */
export function lensFor(recipe: WikiRecipe, record: LarTiddlerRecord): RecordLens {
  const version = record.meta?.schemaVersion;
  if (!version || !recipe.lenses) return identityLens;
  return recipe.lenses.get(version) ?? identityLens;
}

// ── Heads comparison helpers ────────────────────────────────────────────────

/**
 * Set-semantic equality for Automerge Heads.
 *
 * **Why set-semantics:** Automerge `Heads` is a
 * mathematical *set* of change hashes — the DAG frontier — but the API
 * returns it as a string[]. Order is not contractually deterministic across
 * save/load or across implementations. Prior Automerge bugs traced to
 * order-sensitive heads comparison causing sync loops. Always compare as
 * sorted arrays or sets. See:
 *   - https://github.com/automerge/automerge/releases (heads-arg correctness fix)
 *   - https://github.com/automerge/beelay/blob/main/docs/protocol.md (sorted-then-hashed)
 */
export function headsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  // Sort once then compare; cheap for typical frontier size (1–3 entries).
  const sa = [...a].sort();
  const sb = [...b].sort();
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) return false;
  }
  return true;
}

/**
 * BagPinState — per-bag pin status returned by `CompositeStore.auditPins`.
 *
 *   unpinned  — the recipe carries no pin for this bag
 *   matched   — current bag heads equal the pinned heads (set-semantically)
 *   drifted   — current heads differ from pinned (bag moved since pin)
 *   absent    — pinned bag has no layer registered on this composite
 *   opaque    — bag layer exists but cannot expose heads (e.g. MemoryTiddlerStore)
 *
 * Default policy: audit-only. Operators read the audit; downstream consumers
 * MAY refuse, time-travel via `view(pinnedHeads)`, or warn. Loud silent
 * refusal at the read path stays out of scope per the
 * residency-model deferred-enactment design (modal-view reader belongs to
 * a follow-up sprint with explicit "detached" operator UX).
 */
export type BagPinState =
  | { readonly state: "unpinned" }
  | { readonly state: "matched";  readonly heads:  readonly string[] }
  | { readonly state: "drifted";  readonly pinned: readonly string[]; readonly current: readonly string[] }
  | { readonly state: "absent" }
  | { readonly state: "opaque" };

/**
 * Full expanded slot order — top of array = highest priority (first wins).
 * Iterating bottom→top (reverse) gives the addLayer order for CompositeStore.
 */
export function expandRecipe(r: WikiRecipe): readonly SlotUri[] {
  const slug = r.wikiSlug;
  // Deduped: when the wiki's OWN canon bag coincides with a structural slot (the
  // lares-as-wiki quine — slug "lares" → wikiBagUri = LARES_BAG), the slot
  // lays ONCE, at its highest-priority position.
  return [...new Set<SlotUri>([
    wikiSlotUri(slug, "temp"),
    wikiSlotUri(slug, "draft"),
    wikiSlotUri(slug, "personal"),
    // working = the live write layer (normal edits route here via the
    // current-wiki-bag cascade); the wiki's own bags/{slug} canon rides BELOW as
    // the read-only library member, published to only by a promotion MOVE
    // (wiki-layer-ontology#shore-law). Working (live) and canon stay distinct layers.
    wikiSlotUri(slug, "working"),
    wikiBagUri(slug),
    ...(r.libraryBags ?? []),
    // oracle = the universal floor (engine + grammar + bag-oracle). The lares and
    // lararium bags never stand as the floor — they ride a wiki's libraryBags (the lares
    // wiki-recipe = oracle floor + lararium bag + lares bag).
    ORACLE_BAG,
  ])];
}

// Write routing happens via the in-wiki `lar:///ha.ka.ba/lararium/config/bag-paths` cascade
// (IslandAdaptor._routeBag walks it). The cascade evaluates filter expressions
// against the saving tiddler — first non-empty result is the target slot URI.
// Operator-configurable at runtime; per-wiki overlays compose via the recipe
// cascade. See: lar:///ha.ka.ba/lares/api/lararium/bag-paths-cascade

// ── Recipe fingerprint ──────────────────────────────────────────────────────

import { sha256Hex, canonicalJsonBytes, defaultCryptoProvider, type DigestProvider } from "./crypto.js";

/**
 * Recipe-fingerprint input — the canonical bag-doc-id set that names "the
 * same recipe" for purposes of cross-device personal binding.
 *
 * Fingerprint algorithm (personal-slot): only the wiki bag
 * doc-id and the libraryBags doc-ids participate. The lares and lararium bag
 * doc-ids do NOT participate — switching personality or system bag does
 * not fork operator view state across devices.
 */
export interface RecipeFingerprintInput {
  /** The wiki canon bag's Automerge doc URL (grants.wikiUrl = bags/{slug}). */
  readonly wikiDocId: string;
  /** Library bag doc URLs in any order — sorted internally before hashing. */
  readonly libraryBagDocIds: readonly string[];
}

/**
 * Compute the recipe-fingerprint for `personal` / `draft` binding.
 *
 * SHA-256 hex over canonical JSON of `{ wikiDocId, libraryBagDocIds: sorted }`.
 * Two devices share an `personal` binding iff their `(PersonaGroup ×
 * fingerprint)` pairs match. The vessel stores `personal` doc URLs keyed by
 * this fingerprint.
 *
 * Sort-stability: the doc-ids get sorted before hashing so caller ordering
 * does not change the fingerprint. `canonicalJson` sorts object keys for
 * further stability.
 *
 * @see lar:///ha.ka.ba/lararium/api/personal-slot#questions Q4
 */
export async function computeRecipeFingerprint(
  input: RecipeFingerprintInput,
  provider: DigestProvider = defaultCryptoProvider,
): Promise<string> {
  const canonical = {
    wikiDocId:        input.wikiDocId,
    libraryBagDocIds: [...input.libraryBagDocIds].sort(),
  };
  return sha256Hex(canonicalJsonBytes(canonical), provider);
}

// ── WikiMountSpec — the isomorphic wiki-island mount spec ──────────────────
//
// One shape both vessel pools take (node VesselIslandPool + browser
// BrowserVesselIslandPool). Divergence rides in the DATA (the recipe's
// `mirrorBags` designation) and in the island's held CAPABILITIES (a node
// pool's `diskMirrorGrant`), never in the method's shape. The caller hands
// typed structural grants; the island resolves library bags from the catalog registry
// itself and reads TW5 core + plugins from the lararium CRDT doc after sync.
export interface WikiMountSpec {
  /** SHA-256 hex of the TW5 core blob. null = pre-CAS; island resolves bytes from the mesh. */
  coreHash: string | null;
  /** WikiRecipe slot structure (wikiSlug + optional libraryBags + mirrorBags). */
  recipe: WikiRecipe;
  /** Typed structural capabilities (engine doc, own bag, personal/draft, catalog registry access). */
  grants: import("./island-protocol.js").IslandGrants;
}

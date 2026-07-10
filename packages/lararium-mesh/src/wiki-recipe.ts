/**
 * wiki-recipe — one-model recipe spec for every wiki.
 *
 * Slot order = cascade order. Top of stack wins (TW5 cascade law).
 *
 *   lar:///ha.ka.ba/@temp       — volatile, in-memory, $:/temp/* lives here
 *   lar:///ha.ka.ba/@draft      — "Draft of …" tiddlers, CRDT, high-churn
 *   lar:///ha.ka.ba/@personal   — operator cross-device viewing state ($:/StoryList,
 *                                 $:/state/folded/*, $:/state/tab-*), CRDT, keyed per
 *                                 (PersonaGroup × recipe-fingerprint) by the vessel
 *                                 resolver (see personal-slot#scoping-mechanism).
 *                                 Slot URI literal here; per-recipe doc binding rides
 *                                 the manifest's typed grants, not the URI.
 *   lar:///ha.ka.ba/@<slug>     — wiki identity bag, CRDT, operator's edits land here
 *   libraryBags[]                 — optional content libraries, CRDT, read-only from wiki
 *                                 (the @lares wiki-recipe carries @lararium + @lares here)
 *   lar:///ha.ka.ba/@oracle     — runtime system island: engine core + plugins + grammar +
 *                                 bag-oracle; the UNIVERSAL FLOOR of every recipe, CRDT, required
 *
 * @lares (personality) and @lararium (engine corpus) are NOT the floor — they
 * ride a wiki's libraryBags. The @lares wiki-recipe = @oracle + @lararium + @lares.
 *
 * Above-stack projections defer (separate concern). When they land they will
 * subscribe to nalu events, not participate in the cascade.
 *
 * Schema: lar:///ha.ka.ba/@lares/api/lararium/wiki-recipe
 */

import type { AutomergeUrl } from "@automerge/automerge-repo";
import type { Heads } from "@automerge/automerge";
import type { LarTiddlerRecord } from "./tiddler-store.js";
import { ORACLE_DOC_URI, LARARIUM_DOC_URI, LARES_DOC_URI } from "./lar-uris.js";

/** A slot URI in the lar:///ha.ka.ba/@<name> namespace. */
export type SlotUri = string;

/**
 * Seven fixed slot URIs always present in every recipe. The wiki identity slot
 * derives from `wikiSlug` via `wikiBagUri()`. @temp/@draft/@working/@personal
 * name themselves here (no canonical home elsewhere); @lares/@lararium
 * single-source from the derived `lar-uris.ts` consts so the URI lives once.
 */
export const TEMP_BAG     = "lar:///ha.ka.ba/@temp"     as const;
export const DRAFT_BAG    = "lar:///ha.ka.ba/@draft"    as const;
/** @working — the wiki's SAVED live write layer (PersonaGroup×fingerprint-bound,
 *  cross-device); normal edits route here, canon publishes on a promotion MOVE
 *  (wiki-layer-ontology#shore-law). Distinct from @draft's unsaved drafts. */
export const WORKING_BAG  = "lar:///ha.ka.ba/@working"  as const;
export const PERSONAL_BAG = "lar:///ha.ka.ba/@personal" as const;
export const LARES_BAG    = LARES_DOC_URI;
export const LARARIUM_BAG = LARARIUM_DOC_URI;
/** @oracle — the runtime system island; the universal floor of every recipe. */
export const ORACLE_BAG   = ORACLE_DOC_URI;

/** Build a wiki identity bag URI from a slug. The quine: a wiki's canon IS the
 *  `@{slug}` bag (a user bag in @catalog, a system bag in @oracle) — never nested
 *  under the @lararium corpus (that was pre-plane-split ontology). */
export function wikiBagUri(slug: string): SlotUri {
  return `lar:///ha.ka.ba/@${slug}`;
}

/** The per-wiki draft bag, rooted at the wiki's own `@{slug}` canon. */
export function wikiDraftBagUri(slug: string): SlotUri {
  return `${wikiBagUri(slug)}/draft`;
}

/**
 * Extract the slug from a lar URI of the form `lar:///ha.ka.ba/@<slug>`.
 * Falls back to the input string for malformed inputs (callers can detect
 * by comparing input === slugFromUri(input) — true means malformed).
 */
export function slugFromUri(uri: string): string {
  const match = /^lar:\/\/\/ha\.ka\.ba\/@([^/]+)/.exec(uri);
  return match ? match[1]! : uri;
}

/**
 * WikiRecipe — the one shape that fits every wiki under the sun.
 *
 *   daemonRecipe: { wikiSlug: "daemon" }
 *   sdmRecipe:   { wikiSlug: "synthetic-dream-machine",
 *                  libraryBags: ["lar:///ha.ka.ba/@sdm", "lar:///ha.ka.ba/@ftls"] }
 */
export interface WikiRecipe {
  /** Identity slug; expands to lar:///ha.ka.ba/@<wikiSlug>. */
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
   * Optional bag-epoch pins — Anti-pattern #5 defense (recipe-drift poisoning).
   * Each pinned slot carries an Automerge Heads array naming the expected state.
   * When a slot carries a pin, `CompositeStore.auditEpochs(recipe)` reports
   * the drift state per bag; `resolveAllRespectingPins(recipe, title)` skips
   * drifted bags from the read path. Default reads (`resolveAll` / `get` /
   * `resolveTopmost`) stay unaffected — opt-in by call site.
   * Default null/absent = unpinned.
   */
  readonly bagEpochs?: ReadonlyMap<SlotUri, Heads>;

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
 * EpochPinState — per-bag pin status returned by `CompositeStore.auditEpochs`.
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
export type EpochPinState =
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
  // Deduped: when the wiki's OWN bag coincides with a structural slot (the
  // @lares-as-wiki quine — slug "lares" → wikiBagUri = LARES_BAG), the slot
  // lays ONCE, at its highest-priority position.
  return [...new Set<SlotUri>([
    TEMP_BAG,
    DRAFT_BAG,
    PERSONAL_BAG,
    // @working = the live write layer (normal edits route here via the
    // current-wiki-bag cascade); the wiki's own @{slug} bag rides BELOW as the
    // read-only canon library member, published to only by a promotion MOVE
    // (wiki-layer-ontology#shore-law). The quine no longer collapses them.
    WORKING_BAG,
    wikiBagUri(r.wikiSlug),
    ...(r.libraryBags ?? []),
    // @oracle = the universal floor (engine + grammar + bag-oracle). @lares and
    // @lararium are NOT the floor — they ride a wiki's libraryBags (the @lares
    // wiki-recipe = @oracle floor + @lararium + @lares).
    ORACLE_BAG,
  ])];
}

// Write routing happens via the in-wiki `lar:///ha.ka.ba/@lararium/config/bag-paths` cascade
// (IslandAdaptor._routeBag walks it). The cascade evaluates filter expressions
// against the saving tiddler — first non-empty result is the target slot URI.
// Operator-configurable at runtime; per-wiki overlays compose via the recipe
// cascade. See: lar:///ha.ka.ba/@lares/api/lararium/bag-paths-cascade

// ── Recipe fingerprint ──────────────────────────────────────────────────────

import { sha256Hex, canonicalJsonBytes, defaultCryptoProvider, type DigestProvider } from "./crypto.js";

/**
 * Recipe-fingerprint input — the canonical bag-doc-id set that names "the
 * same recipe" for purposes of cross-device @personal binding.
 *
 * Fingerprint algorithm (personal-slot): only the wiki bag
 * doc-id and the libraryBags doc-ids participate. @lares and @lararium
 * doc-ids do NOT participate — switching personality or system bag does
 * not fork operator view state across devices.
 */
export interface RecipeFingerprintInput {
  /** The wiki identity bag's Automerge doc URL (grants.wikiUrl). */
  readonly wikiDocId: string;
  /** Library bag doc URLs in any order — sorted internally before hashing. */
  readonly libraryBagDocIds: readonly string[];
}

/**
 * Compute the recipe-fingerprint for `@personal` / `@draft` binding.
 *
 * SHA-256 hex over canonical JSON of `{ wikiDocId, libraryBagDocIds: sorted }`.
 * Two devices share an `@personal` binding iff their `(PersonaGroup ×
 * fingerprint)` pairs match. The vessel stores `@personal` doc URLs keyed by
 * this fingerprint.
 *
 * Sort-stability: the doc-ids get sorted before hashing so caller ordering
 * does not change the fingerprint. `canonicalJson` sorts object keys for
 * further stability.
 *
 * @see lar:///ha.ka.ba/@lararium/api/personal-slot#questions Q4
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
// typed structural grants; the island resolves library bags from @catalog
// itself and reads TW5 core + plugins from the @lararium CRDT doc after sync.
export interface WikiMountSpec {
  /** SHA-256 hex of the TW5 core blob. null = pre-CAS; island resolves bytes from the mesh. */
  coreHash: string | null;
  /** WikiRecipe slot structure (wikiSlug + optional libraryBags + mirrorBags). */
  recipe: WikiRecipe;
  /** Typed structural capabilities (engine doc, own bag, @personal/@draft, @catalog access). */
  grants: import("./island-protocol.js").IslandGrants;
}

/**
 * recipe — RecipeTiddler schema + URI helpers for Lares recipe tiddlers.
 *
 * Canonical home: @lararium/mesh.
 * Public face: @lararium/tw5 re-exports this module as the operator-facing surface.
 *
 * A recipe tiddler functions as a first-class tiddler stored inside a root doc (typically
 * LarariumDoc or CatalogDoc) that describes an ordered bag stack for a TW5 VM.
 * Recipes bridge the static Automerge doc topology and the dynamic
 * TW5 FilterRecipe evaluation surface.
 *
 * Recipe tiddler addressing:
 *   recipeUri("@lararium", "default")  → "lar:///ha.ka.ba/lararium/recipes/default"
 *   recipeUri("@catalog",  "elyncia")  → "lar:///ha.ka.ba/bags/catalog/recipes/elyncia"
 *
 * Bag stack order: lowest-priority first → highest-priority last (TW5 convention).
 * Each entry in `bagStack` is a well-known lar: bag ID (a root doc URI or corpusLarUri).
 *
 * Genesis seeds NO recipes — user recipes live in the user's @catalog (registry),
 * minted per-wiki by init-wiki. @lararium stays pure protocol substrate.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/recipe
 */

// ---------------------------------------------------------------------------
// BagTiddler — bag descriptor stored in the ha island (one per root-doc bag)
//
// TW5 Bags and Recipes model: "bags have access controls that determine which
// users can read or write to them."  BagTiddler makes those policies first-class
// tiddlers rather than ephemeral runtime flags.
//
// Policy values (open-ended string; enforced by the authority layer):
//   "public"          — any peer may read / write
//   "private"         — owning operator only
//   "group:{uri}"     — members of the group at lar: uri
//
// Self-describing: each root-doc bag carries its own descriptor tiddler inside
// the ha island.  Corpus / wiki bags seed their own descriptor inside their doc.
//
// Meme: lar:///ha.ka.ba/lararium/mesh/bag
// ---------------------------------------------------------------------------

export interface BagTiddler {
  /** Stable lar: URI of the bag this tiddler describes (= the bag's Automerge doc). */
  readonly title:       string;
  /** Human-readable label for UI display. */
  readonly label:       string;
  /** Read-access policy expression. Default: "public". */
  readonly readPolicy:  string;
  /** Write-access policy expression. Default: "private" for root docs; "public" for wiki draft bags. */
  readonly writePolicy: string;
  /**
   * The bag's DECLARED cap-tier — the SELF-DESCRIBING sharing-posture datum the quine speaks (cap-tier.ts).
   * ONE question, WHO holds the read-cap, as the chain VEIL ⊂ PERSONAGROUP ⊂ CONTRACT ⊂ PUBLIC. This datum
   * only DECLARES; the federation gate ENFORCES `declared ∧ structural-floor` (`capTierShareDecision`), so a
   * bag may only ever self-TIGHTEN below its crypto floor — a declared PUBLIC on a sealed-floor bag resolves
   * to the sealed tier, never PUBLIC. Absent / torn → VEIL (fail-closed; `parseCapTier`). A per-tiddler
   * refinement (a tiddler's own `capTier` field) may tighten a bag further via the taint-meet, never loosen
   * it. This is the bag-level DEFAULT the recipe surface carries.
   */
  readonly capTier?:    import("./cap-tier.js").CapTier;
  /** ISO 8601 creation / last-update timestamp. */
  readonly updatedAt:   string;
  /** Authority that created this descriptor. */
  readonly authority:   string;
  /** Owning bag (ha island for root-doc descriptors). */
  readonly bag:         string;
}

export { bagDescriptorUri } from "./lar-uris.js";

// ---------------------------------------------------------------------------
// RecipeTiddler — stored shape
// ---------------------------------------------------------------------------

export interface RecipeTiddler {
  /** Stable lar: URI of this recipe tiddler (its own address). */
  readonly title:      string;
  /** Human-readable name shown in recipe picker UI. */
  readonly label:      string;
  /** Ordered bag IDs: lowest priority → highest priority (TW5 convention). */
  readonly bagStack:   readonly string[];
  /**
   * Optional: the single writable bag ID for writes routed through this recipe.
   * When absent, writes fall through to the CompositeStore's default writable layer.
   * Set to the highest-priority bag in the stack for typical recipe use.
   */
  readonly writableBag?: string;
  /**
   * Optional: vendored TW5 community plugin blob IDs to preload for this Recipe's vm.
   * Each entry is the blob's id (e.g. "$:/plugins/sq/streams").
   * When absent or empty, no vendored plugins are preloaded (minimal vm).
   * Opt-in per Recipe — plugins are never forced into all vms.
   */
  readonly plugins?: readonly string[];
  /** ISO 8601 creation / last-update timestamp. */
  readonly updatedAt:  string;
  /** Authority that wrote this recipe tiddler. */
  readonly authority:  string;
  /** Owning bag (root doc URI where this tiddler lives). */
  readonly bag:        string;
}

// ---------------------------------------------------------------------------
// URI helpers
// ---------------------------------------------------------------------------

export { recipeUri } from "./lar-uris.js";

// ---------------------------------------------------------------------------
// parseBagStack — isomorphic helper
// ---------------------------------------------------------------------------

/**
 * Parse a bagStack value from a tiddler field into a string array.
 *
 * Handles two storage formats:
 *   - TW5 list string: `"lar:///a lar:///b lar:///c"` (space-separated; no spaces
 *     appear in lar: URIs so no [[...]] quoting required).
 *   - JS/JSON array: `["lar:///a", "lar:///b"]` (Automerge-stored or deserialized).
 *
 * Returns [] for null / undefined / unrecognised types.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/recipe
 */
/**
 * Parse a plugins value from a recipe tiddler field into a string array.
 * Same format as bagStack: space-separated blob IDs or JS array.
 * Returns [] when absent — callers treat empty list as "no vendored plugins".
 */
export function parsePlugins(raw: unknown): string[] {
  return parseBagStack(raw);
}

export function parseBagStack(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return (raw as unknown[]).filter((x): x is string => typeof x === "string");
  }
  if (typeof raw === "string") {
    return raw.trim().split(/\s+/).filter(Boolean);
  }
  return [];
}

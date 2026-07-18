/**
 * wiki-activation — the ACTIVATION-ON-REFERENCE capability (a base mesh #has cap).
 *
 * A reference to a wiki grain ACTIVATES it (Orleans virtual-actors: the grain
 * wakes on reference; the caller need not know it slept). The vessel HOLDS this
 * cap; the resolver READS it — so verb routing calls `ensureActive(wikiId)` and
 * only then places the verb, instead of rejecting a cold grain outright. A
 * cold→wela activation is a LOCAL-FIRST act on the vessel's own island (no global
 * now): it heats the grain through the ONE residency collector, which mounts a
 * cold grain (onHydrate → pool.ensureWiki) and enforces the wiki cap (onEvict →
 * pool.unmountWiki the LRU wiki), all single-flight (one sovereign body per stream).
 *
 * ONE cap, a SPECTRUM of grants (the vessel gradient): a resource-rich vessel
 * (node) advertises a high `activationCap` + `pinBudget` (concurrent multi-wiki);
 * a constrained vessel (browser) advertises a minimal grant (@daemon always + a
 * small active set), degrading gracefully — the resolver honors whatever grant the
 * vessel carries. @daemon's always-there pin holds on every grant level; the user
 * MAY hold up to `pinBudget` further rotatable wiki pins (vessel-resource scaled).
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/wiki-activation
 */

import type { WikiMountSpec } from "./wiki-recipe.js";

/** The residency collector surface the cap heats a grain through (BagResidencyManager). */
export interface ActivationResidency {
  touch(url: string, grainType?: string): Promise<void>;
}

/** The pool surface the cap reads (VesselIslandPoolCore): liveness + spec knowledge,
 *  plus the register-spec seam the unknown-grain resolver teaches through. */
export interface ActivationPool {
  has(wikiId: string): boolean;
  knowsSpec(wikiId: string): boolean;
  registerSpec(wikiId: string, spec: WikiMountSpec, opts?: { pinned?: boolean }): void;
}

/**
 * Resolve a never-opened wiki's mount spec from its recipe/catalog — the UNKNOWN-grain
 * branch of activation-on-reference (the true multi-wiki swap). The vessel supplies it,
 * closing over the catalog + binding resolver. Returns null for a genuinely-unknown
 * reference (no catalog entry) → the caller parks/drops. Absent entirely → retain-only
 * (a bare reference only reactivates a grain the pool already mounted once).
 */
export type ResolveWikiSpec = (wikiId: string) => Promise<WikiMountSpec | null>;

/**
 * The vessel's activation GRANT — the spectrum point this vessel advertises.
 * `activationCap` bounds the concurrent live-wiki set (the collector's `wiki`
 * typeCap); `pinBudget` bounds the user's rotatable wiki pins BESIDES @daemon.
 */
export interface WikiActivationGrant {
  readonly activationCap: number;
  readonly pinBudget:     number;
}

export interface WikiActivationCap {
  /**
   * Ensure a wiki grain is live, activating a cold/known grain on reference.
   * Returns true when the grain is live after the call. A NEVER-mounted grain
   * (no retained spec, under retain-only) returns false WITHOUT registering a
   * phantom resident — the caller parks the verb (the mailbox fallback) until the
   * grain's spec is resolvable (`resolveWikiSpec`, the multi-wiki follow-on).
   */
  ensureActive(wikiId: string): Promise<boolean>;
  /** This vessel's advertised grant (the gradient point the resolver honors). */
  readonly grant: WikiActivationGrant;
}

/**
 * Build the activation cap over a residency collector + a pool + the vessel grant.
 * The vessel constructs it once and hands it to the resolver. `resolveSpec` (optional)
 * is the UNKNOWN-grain branch — the true multi-wiki swap; absent → retain-only.
 */
export function makeWikiActivationCap(
  residency: ActivationResidency,
  pool:      ActivationPool,
  grant:     WikiActivationGrant,
  resolveSpec?: ResolveWikiSpec,
): WikiActivationCap {
  return {
    grant,
    async ensureActive(wikiId: string): Promise<boolean> {
      // Already live → done (cheap, the common case for a pinned/active wiki).
      if (pool.has(wikiId)) return true;
      // Unknown grain (the pool never mounted it, no retained spec): the true swap
      // RESOLVES its spec from the recipe/catalog and teaches the pool, so a bare
      // reference wakes ANY wiki cold. A genuinely-unknown reference (resolveSpec
      // null, or no resolver under retain-only) refuses cleanly — the caller parks;
      // touching an unresolved grain would strand a phantom resident (wela in the
      // collector, cold in the pool), so we teach-BEFORE-touch or not at all.
      if (!pool.knowsSpec(wikiId)) {
        const spec = resolveSpec ? await resolveSpec(wikiId) : null;
        if (!spec) return false;
        pool.registerSpec(wikiId, spec);   // teach it (no mount) — now knowsSpec
      }
      // Heat the grain through the ONE collector: `touch` marks it wela (its
      // onHydrate mounts the now-known grain via pool.ensureWiki, single-flight) and
      // enforces the wiki cap (onEvict unmounts the LRU wiki). Local-first act.
      await residency.touch(wikiId, "wiki");
      return pool.has(wikiId);
    },
  };
}

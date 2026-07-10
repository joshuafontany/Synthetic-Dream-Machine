/**
 * island-context — shared IslandContext and IslandBehavior types.
 *
 * These types hold identical structure on all platforms (Node worker_threads,
 * browser Web Workers, future WASM/UE5 runtimes). The sovereign island kernel
 * on each platform constructs and passes this context; behaviors depend only
 * on this contract, never on platform-specific APIs.
 *
 * Lives in @lararium/tw5 because TW5Engine is the only non-mesh import —
 * placing it here avoids a circular dependency while keeping it isomorphic.
 *
 * Island Sovereignty Law §9: TW5 SHALL NOT instantiate on the main thread.
 * Every TW5Engine lives inside a sovereign Worker. Behaviors therefore always
 * receive this context from within a Worker — never from a main-thread caller.
 *
 * Meme: lar:///ha.ka.ba/@lararium/tw5/island-context
 */

import type { DocHandle }                        from "@lararium/mesh";
import type { CompositeStore, IslandToVesselMsg, LarDoc, Repo, WikiRecipe } from "@lararium/mesh";
import type { TW5Engine }                        from "./tw5-vm.js";

export interface IslandContext {
  wikiUri:   string;
  composite: CompositeStore;
  tw5:       TW5Engine;
  handles:   Map<string, DocHandle<LarDoc>>;
  post:      (msg: IslandToVesselMsg) => void;
  /**
   * The island-side Automerge Repo. Island behaviors that mint docs (e.g. the
   * daemon island's @personal/@draft binding resolver) create them here; the docs
   * sync to the host relay via the manifest syncPort. Isomorphic-vessel Stage 1.
   */
  repo:      Repo;
  /**
   * The `@catalog` registry doc URL (null if the island carries no catalog slot).
   * The isomorphic base for catalog-driven reach: a worker behavior builds
   * `makeCatalogAccessor(ctx.repo, ctx.catalogUrl)` to reach ANY registered bag
   * on demand — access≠load (the catalog is NOT a render layer). Carried in the
   * manifest's `grants.catalogUrl`; the kernel lifts it here.
   */
  catalogUrl: string | null;
  /**
   * The `@oracle` runtime system-island doc URL (= `grants.islandUrl`). The
   * **system** oracle plane: system bags (`@oracle`,
   * `@lararium`, `@lares`) + the system wiki-recipes resolve from here, the way
   * user bags resolve from `@catalog`. recipe-watch reads a system wiki's recipe
   * via `recipeUri("@oracle", slug)` and resolves system bags from this doc.
   */
  oracleUrl: string | null;
  /**
   * The engine identity this island actually booted — sha256 the kernel computed
   * over the core bytes it eval'd (never the blob entry's self-claim) + the blob
   * entry's version string. The engine-watch compares the live `@lararium` doc
   * against this to detect a waiting engine epoch (alert-only; reboot adopts).
   */
  engine: { sha256: string; version: string };
  /**
   * The WikiRecipe this island mounted from (the manifest's slot structure).
   * The recipe-watch reads `wikiSlug` to find its own `@catalog` recipe record
   * and reconcile composition changes live.
   */
  recipe: WikiRecipe;
}

/**
 * Caller-supplied behavior module — the domain-specific half of the OTP
 * gen_island pair. The sovereign island kernel owns lifecycle plumbing;
 * behaviors own what distinguishes one island type from another.
 *
 * Under the one-recipe model, write routing happens via the in-wiki cascade
 * (`lar:///ha.ka.ba/@lararium/config/bag-paths`) — daemon and wiki behaviors
 * share the same recipe shape; their differences live in `onEa` / `onSignal`.
 *
 * - `onEa`     — called after CompositeStore + IslandAdaptor wired, before ea.
 * - `onSignal` — called for every non-lifecycle message. Return true if handled.
 * - `onHooAnu` — called before drain loop stops.
 */
export interface IslandBehavior {
  onEa(ctx: IslandContext): void | Promise<void>;
  onSignal(type: string, raw: unknown, ctx: IslandContext): boolean;
  onHooAnu(ctx: IslandContext): void | Promise<void>;
}

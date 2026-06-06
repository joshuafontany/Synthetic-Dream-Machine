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
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/island-context
 */

import type { DocHandle }                        from "@lararium/mesh";
import type { CompositeStore, IslandToVesselMsg, LarDoc, Repo } from "@lararium/mesh";
import type { TW5Engine }                        from "./tw5-vm.js";

export interface IslandContext {
  wikiUri:   string;
  composite: CompositeStore;
  tw5:       TW5Engine;
  handles:   Map<string, DocHandle<LarDoc>>;
  post:      (msg: IslandToVesselMsg) => void;
  /**
   * The island-side Automerge Repo. Island behaviors that mint docs (e.g. the
   * admin island's @personal/@draft binding resolver) create them here; the docs
   * sync to the host relay via the manifest syncPort. Isomorphic-vessel Stage 1.
   */
  repo:      Repo;
}

/**
 * Caller-supplied behavior module — the domain-specific half of the OTP
 * gen_island pair. The sovereign island kernel owns lifecycle plumbing;
 * behaviors own what distinguishes one island type from another.
 *
 * Under the one-recipe model, write routing happens via the in-wiki cascade
 * (`lar:///ha.ka.ba/@lararium/config/bag-paths`) — admin and wiki behaviors
 * share the same recipe shape; their differences live in `onEa` / `onSignal`.
 *
 * - `onEa`     — called after CompositeStore + IslandAdaptor wired, before ea.
 * - `onSignal` — called for every non-lifecycle message. Return true if handled.
 * - `onDemote` — called before drain loop stops.
 */
export interface IslandBehavior {
  onEa(ctx: IslandContext): void | Promise<void>;
  onSignal(type: string, raw: unknown, ctx: IslandContext): boolean;
  onDemote(ctx: IslandContext): void | Promise<void>;
}

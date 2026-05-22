import type { LarTiddlerStore } from "./tiddler-store.js";

/**
 * LarOpenPhase — canonical vessel boot sequence shared by all platform runtimes.
 * Phase order is monotonic — never goes backward.
 */
export type LarOpenPhase =
  | "boot"           // factory called; repo not yet open
  | "repo-open"      // Repo + adapters initialized
  | "catalog-ready"  // catalog DocHandle resolved
  | "island-ready"   // island (system bag) resolved — may arrive async
  | "wiki-ready"     // wiki DocHandle resolved
  | "draft-ready"    // wiki-drafts DocHandle resolved
  | "vessel-ready"   // LarVessel constructed, CompositeStore wired
  | "tw5-booted"     // TW5Engine.boot() resolved
  | "corpus-ready"   // corpus bags attached (fires once all initial corpora loaded)
  | "live";          // IslandAdaptor wired, VmPool attached

/**
 * VesselVmFactory — caller-injected VM constructor shared by browser and node vessels.
 *
 * The platform factory owns engine boot and bag-stack derivation. The VM factory only
 * receives the resolved recipe scope for the vessel lane it is opening.
 */
export type VesselVmFactory<TVm, TEngine> = (
  recipeUri: string,
  engine: TEngine,
  bagStack: readonly string[],
) => Promise<TVm>;

/**
 * OpenVesselOptions — shared browser/node vessel open inputs.
 *
 * Platform vessels may extend this with transport, storage, or mount-specific fields,
 * but these fields stay common across every vessel factory.
 */
export interface OpenVesselOptions<TVm = unknown, TEngine = unknown> {
  hostId: string;
  wikiId: string;
  recipeUri?: string;
  onPhase?: (phase: LarOpenPhase) => void;
  vmFactory?: VesselVmFactory<TVm, TEngine>;
}

/**
 * OpenVesselResult — shared browser/node vessel open output.
 *
 * Runtime-specific factories may extend this with edge adaptors or UI mounts, but the
 * common vessel/runtime/store/pool surface lives here so every vessel open reads alike.
 */
export interface OpenVesselResult<
  TVessel = unknown,
  TPool = unknown,
  TRepo = unknown,
  TStore extends LarTiddlerStore = LarTiddlerStore,
> {
  vessel: TVessel;
  pool: TPool;
  repo: TRepo;
  store: TStore;
  catalogHandleUrl: string;
  larariumDocUrl: string | null;
  phase: LarOpenPhase;
}

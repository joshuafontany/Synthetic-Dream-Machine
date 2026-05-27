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
  | "live";          // island pool attached, vessel sovereign

/**
 * LarariumVesselOptions — shared browser/node vessel open inputs.
 */
export interface LarariumVesselOptions {
  hostId: string;
  wikiId: string;
  onPhase?: (phase: LarOpenPhase) => void;
}

/**
 * LarariumVesselResult — shared runtime output for any vessel open surface.
 *
 * Runtime-specific factories may extend this with edge adaptors or UI mounts, but the
 * common vessel/runtime/store/pool surface lives here so every vessel open reads alike.
 */
export interface LarariumVesselResult<
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
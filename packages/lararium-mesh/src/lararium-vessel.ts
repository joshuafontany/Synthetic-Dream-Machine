import type { LarTiddlerStore } from "./tiddler-store.js";
import type { Repo } from "@automerge/automerge-repo";
import type { CompositeStore } from "./composite-store.js";

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
  /** Optional — the main-thread `LarVessel` wrapper is being retired (the island
   *  pool is the live surface). Present on platforms that still construct one. */
  vessel?: TVessel;
  pool: TPool;
  repo: TRepo;
  store: TStore;
  catalogHandleUrl: string;
  oracleDocUrl: string | null;
  larariumDocUrl: string | null;
  phase: LarOpenPhase;
}

/**
 * VesselResult — the ONE shared vessel-open result (no vessel-by-type). Both node and
 * browser return this; only the substrate type-params differ (TPool = the platform island
 * pool, TDaemon = the platform admin VM). Substrate extras (node's eventBus/stopTick,
 * browser's engineUpdated) extend this — never a fork of the common surface. The retired
 * LarVessel wrapper has no slot here.
 */
export interface VesselResult<TPool, TDaemon> {
  pool:             TPool;
  repo:             Repo;
  store:            CompositeStore;
  admin:            TDaemon;
  activeWikiId:     string;
  activeWikiSource: "boot-arg" | "admin-marker";
  wikiDocUrl:       string;
  catalogHandleUrl: string;
  oracleDocUrl:     string | null;
  larariumDocUrl:   string | null;
  phase:            LarOpenPhase;
}
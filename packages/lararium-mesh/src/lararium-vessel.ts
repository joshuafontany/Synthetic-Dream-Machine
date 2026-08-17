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
  /** Optional. The ISLAND POOL is the live surface; a platform that also constructs a main-thread wrapper
   *  hands it here, and one that does not simply omits it. Nothing reads this to decide behaviour. */
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
 * pool, TDaemon = the platform daemon VM). Substrate extras (node's eventBus/stopTick,
 * browser's engineUpdated) extend this — never a fork of the common surface. The surface names the pool,
 * the repo, the store and the daemon; no main-thread wrapper occupies a slot.
 */
export interface VesselResult<TPool, TDaemon> {
  pool:             TPool;
  repo:             Repo;
  store:            CompositeStore;
  daemon:           TDaemon;
  activeWikiId:     string;
  activeWikiSource: "boot-arg" | "daemon-marker";
  wikiDocUrl:       string;
  catalogHandleUrl: string;
  /**
   * This vessel's OWN @daemon doc — the plane a caller writes a verb SUMMONS onto.
   *
   * Every other url here names something a vessel reads; this one names where it is ASKED. The composite
   * store reads and never writes, so a summons rides the repo and this handle: the dispatcher relays it into
   * a volatile invocation and lands the outcome back on the same plane. Without it a host surface can render
   * a vessel and never call it.
   *
   * @daemon stays SOVEREIGN-PER-VESSEL — it never fleet-syncs, because it is the PLACE's own control plane
   * and two places sharing one would stand a global now across the fleet. A caller therefore knocks on the
   * door of the vessel it means to summon, by that vessel's own url here; @persona is what crosses between
   * a face's vessels, and @circles what syncs across one operator's devices.
   */
  daemonDocUrl:     string;
  /** The HEARTH's @daemon — where THIS vessel asks for its seat. Null when it founded its own face and so
   *  IS the hearth, knocking on no one. Distinct from `daemonDocUrl`, which names this vessel's own plane. */
  hearthDaemonUrl:  string | null;
  oracleDocUrl:     string | null;
  larariumDocUrl:   string | null;
  phase:            LarOpenPhase;
}
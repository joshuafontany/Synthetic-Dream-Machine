/**
 * node-caps — the node vessel's #has-cap-stack, wired by the composable-keel engine.
 *
 * A vessel = a #has-cap-stack (the flat, dependency-blind set of cap-modules it HAS); `composeVessel`
 * reads the stack and topologically WIRES the live components, handing each a POLA-scoped resolver.
 * Vessel-TYPES are different STACKS, never feature-flags: a Herm is not "a node with wiki=false" — it
 * is a stack that never declares the wiki/pool caps, so nothing routes to them (blind by structure).
 *
 * Two node stacks ride here:
 *   - composeLararium — the FULL node. Its single `lararium-core` cap delegates the VM sequence to the
 *     SHARED orchestrator `openVesselCore` (the one keel both node + browser walk), so the immune
 *     core's behaviour stays verbatim — no fork of the tested boot. (Decomposing that tail into
 *     granular substrate/wiki/pool caps rides a later cut, gated on a live-boot witness.)
 *   - composeHerm — the Lares Viales / Herm: a wiki-LESS wayfarer composed UP from granular caps —
 *     substrate (the @oracle island + social plane) + the @daemon immune core + a writable @meshpalace
 *     FLOW-map + the read-face that serves it. NO wiki, NO pool. The @daemon STAYS (the immune core
 *     lives in both stacks); its registerBags simply omits the absent user-wiki bags — the decouple.
 *
 * Canon: lar:///ha.ka.ba/@lararium/api/composable-keel · …/mesh/vessel-caps#lares-viales
 */

import type { Server } from "node:http";
import type { Repo, DocHandle } from "@automerge/automerge-repo";
import {
  composeVessel, type CapModule, type ComposedVessel,
  assembleVessel, AutomergeDocStore,
  MESH_PALACE_BAG, emptyMeshPalaceDoc, type MeshPalaceDoc,
  pullAndVerifyOracle, dialEntryToRecord, type DialEntry, type LarTiddlerRecord,
  type VesselRecipe, type VesselCoreAssembly,
  type BagResidencyManager,
} from "@lararium/mesh";
import {
  openVesselCore, VerbTable,
  type VesselOrchestration, type VesselCoreResult, type VesselDaemonVm,
  type VesselWikiSlot, type PrimaryMountPool,
} from "@lararium/tw5";
import { mountFlowMapReadFace, type OracleReadFace } from "./oracle-read-face.js";

/** The cap-ids that name a node cap-module in a #has-cap-stack. */
export const CAP = {
  substrate:  "substrate",
  wikislot:   "wikislot",
  daemon:     "daemon",
  wiki:       "wiki",
  pool:       "pool",
  meshpalace: "meshpalace",
  carriage:   "carriage",
  readFace:   "read-face",
} as const;

// ── granular caps (each wraps existing machinery, declaring only the deps it needs) ──────────────

/** substrate — the shared keel floor: assembleVessel (composite cascade → genesis @oracle island →
 *  @lares/@lararium canon → social plane @identities/@groups/@sessions/@daemon/@persona + corpora). */
export function substrateCap(keel: VesselRecipe): CapModule {
  return { id: CAP.substrate, build: () => assembleVessel(keel) };
}

export interface DaemonCapDeps {
  /** Open the platform @daemon VM. `slot` ABSENT (herm) → the builder omits the user-wiki bags from
   *  daemonAuth.registerBags (the decouple); the @daemon's own bag (bootstrap.daemonUrl) stays. */
  readonly openDaemon:   (a: { assembly: VesselCoreAssembly; slot?: VesselWikiSlot }) => Promise<VesselDaemonVm>;
  readonly wireVerbs?:   (registry: VerbTable, assembly: VesselCoreAssembly) => void;
  readonly afterDaemon?: (daemon: VesselDaemonVm, assembly: VesselCoreAssembly) => void;
}

/** daemon — the IMMUNE CORE, present in BOTH stacks. Requires substrate; OPTIONALLY routes the wiki
 *  slot (absent in herm). Wires the main verb plane + the after-daemon capability hook in place. */
export function daemonCap(deps: DaemonCapDeps): CapModule {
  return {
    id: CAP.daemon, requires: [CAP.substrate], optional: [CAP.wikislot],
    build: async (resolve) => {
      const assembly = resolve<VesselCoreAssembly>(CAP.substrate);
      const slot     = resolve<VesselWikiSlot | undefined>(CAP.wikislot);  // undefined in the herm stack
      const daemon   = await deps.openDaemon(slot ? { assembly, slot } : { assembly });
      const registry = new VerbTable();
      deps.wireVerbs?.(registry, assembly);
      daemon.mountMainVerbs(registry);
      deps.afterDaemon?.(daemon, assembly);
      return daemon;
    },
  };
}

/** The composed @meshpalace handle a meshpalace cap exposes. */
export interface MeshPalaceComponent { readonly handle: DocHandle<MeshPalaceDoc>; }

/** meshpalace — a writable @meshpalace AutomergeDocStore layer (the vessel's own public FLOW-map) +
 *  a residency pin. Requires substrate (the composite to layer into). */
export function meshPalaceCap(deps: { repo: Repo; residency?: BagResidencyManager; seed?: readonly DialEntry[] }): CapModule {
  return {
    id: CAP.meshpalace, requires: [CAP.substrate],
    build: async (resolve) => {
      const assembly = resolve<VesselCoreAssembly>(CAP.substrate);
      const handle   = deps.repo.create<MeshPalaceDoc>(emptyMeshPalaceDoc());
      // Self-announce: a source Herm seeds its OWN dial(s) on the FLOW-map (public reachability —
      // never others' content). Absent = a leaf/relay that only carries what it pulls.
      if (deps.seed && deps.seed.length > 0) {
        handle.change((d) => {
          for (const e of deps.seed!) { const rec = dialEntryToRecord(e, "herm-self-announce"); d.tiddlers[rec.tiddler.title] = rec; }
        });
      }
      assembly.composite.addLayer({
        bagId: MESH_PALACE_BAG, store: new AutomergeDocStore(handle, MESH_PALACE_BAG),
        writable: true, defaultWritable: true,
      });
      await deps.residency?.pin(MESH_PALACE_BAG, "boot:meshpalace");
      return { handle };
    },
  };
}

/** read-face — serves the @meshpalace PUBLIC FLOW-map over the HTTP server (the disclosure membrane
 *  at the wire). Requires substrate + meshpalace (the doc it projects). Disposes the HTTP face. */
export function flowMapReadFaceCap(deps: {
  httpServer: Server; signerSeed: Uint8Array; storageDir: string; onLog?: (line: string) => void;
}): CapModule {
  return {
    id: CAP.readFace, requires: [CAP.substrate, CAP.meshpalace],
    build: async (resolve) => {
      const mp = resolve<MeshPalaceComponent>(CAP.meshpalace);
      return mountFlowMapReadFace({
        httpServer:       deps.httpServer,
        meshPalaceHandle: mp.handle,
        signerSeed:       deps.signerSeed,
        storageDir:       deps.storageDir,
        ...(deps.onLog ? { onLog: deps.onLog } : {}),
      });
    },
    dispose: (face) => (face as OracleReadFace).dispose(),
  };
}

/** The carriage handle a carriage cap exposes — a manual pull + the loop's stop. */
export interface CarriageComponent { readonly pullOnce: () => Promise<number>; readonly stop: () => void; }

/** carriage — the blind relay: pull each peer's PUBLIC FLOW-map (pullAndVerifyOracle) and merge it into
 *  this vessel's @meshpalace, re-served by the read-face (carry-by-aggregate-reserve). A peer down is no
 *  error — feed-or-fade. Requires meshpalace (the doc to merge into). Empty peers = a no-op (a leaf). */
export function carriageCap(deps: { peers: readonly string[]; pullIntervalMs?: number; onLog?: (line: string) => void }): CapModule {
  return {
    id: CAP.carriage, requires: [CAP.meshpalace],
    build: (resolve) => {
      const mp = resolve<MeshPalaceComponent>(CAP.meshpalace);
      const pullOnce = async (): Promise<number> => {
        let merged = 0;
        for (const peer of deps.peers) {
          let verdict;
          try { verdict = await pullAndVerifyOracle<MeshPalaceDoc>(peer, { nowMs: Date.now() }); }
          catch { continue; } // a peer down/unreachable is no error — feed-or-fade
          if (!verdict.ok || !verdict.doc) continue;
          const incoming = verdict.doc.tiddlers;
          const titles = Object.keys(incoming);
          if (titles.length === 0) continue;
          mp.handle.change((d) => {
            // cross-doc copy → clone to plain values (Automerge refuses a value linked in another doc)
            for (const t of titles) d.tiddlers[t] = JSON.parse(JSON.stringify(incoming[t])) as LarTiddlerRecord;
          });
          merged += titles.length;
          deps.onLog?.(`carriage: merged ${titles.length} FLOW records from ${peer}`);
        }
        return merged;
      };
      const timer = setInterval(() => { void pullOnce(); }, deps.pullIntervalMs ?? 30_000);
      timer.unref();
      void pullOnce(); // carry the peers' maps from the first breath
      return { pullOnce, stop: () => clearInterval(timer) };
    },
    dispose: (c) => (c as CarriageComponent).stop(),
  };
}

// ── the two node cap-stacks ──────────────────────────────────────────────────────────────────────

/**
 * composeLararium — the FULL node #has-cap-stack. The `lararium-core` cap runs the shared
 * `openVesselCore` orchestrator (substrate → wiki-slot → daemon → verbs → wiki → pool → ea-gate →
 * primary-wiki mount → live) verbatim, so node behaviour stays unchanged and the keel stays one.
 */
export async function composeLararium<TPool extends PrimaryMountPool>(
  orchestration: VesselOrchestration<TPool>,
): Promise<{ vessel: ComposedVessel; core: VesselCoreResult<TPool> }> {
  let core: VesselCoreResult<TPool> | undefined;
  const vessel = await composeVessel([
    { id: "lararium-core", build: async () => { core = await openVesselCore(orchestration); return core; } },
  ]);
  return { vessel, core: core! };
}

export interface HermStackDeps extends DaemonCapDeps {
  readonly keel:           VesselRecipe;
  readonly repo:           Repo;
  readonly residency?:     BagResidencyManager;
  readonly httpServer:     Server;
  readonly signerSeed:     Uint8Array;
  readonly storageDir:     string;
  /** Peer base URLs this Herm carries (pulls + merges their FLOW-maps). Empty = a leaf (no carriage). */
  readonly peers?:         readonly string[];
  readonly pullIntervalMs?: number;
  /** Self-announce dials on this Herm's own FLOW-map (a source Herm's reachability). */
  readonly seed?:          readonly DialEntry[];
  readonly onLog?:         (line: string) => void;
}

/** The handles a composed Herm hands back. */
export interface ComposedHerm {
  readonly vessel:           ComposedVessel;
  readonly assembly:         VesselCoreAssembly;
  readonly daemon:           VesselDaemonVm;
  readonly meshPalaceHandle: DocHandle<MeshPalaceDoc>;
  readonly readFace:         OracleReadFace;
}

/**
 * composeHerm — the wiki-LESS wayfarer #has-cap-stack: [substrate, daemon, meshpalace, read-face].
 * No wiki, no pool — blind to sovereign content by structure. The @daemon stays (the immune core);
 * its registerBags omits the absent user-wiki bags (the decouple proven by the daemon-without-wiki
 * finding). The read-face serves the @meshpalace FLOW-map a Herm carries.
 */
export async function composeHerm(d: HermStackDeps): Promise<ComposedHerm> {
  const vessel = await composeVessel([
    substrateCap(d.keel),
    daemonCap(d),
    meshPalaceCap({
      repo: d.repo,
      ...(d.residency ? { residency: d.residency } : {}),
      ...(d.seed ? { seed: d.seed } : {}),
    }),
    carriageCap({
      peers: d.peers ?? [],
      ...(d.pullIntervalMs !== undefined ? { pullIntervalMs: d.pullIntervalMs } : {}),
      ...(d.onLog ? { onLog: d.onLog } : {}),
    }),
    flowMapReadFaceCap({
      httpServer: d.httpServer, signerSeed: d.signerSeed, storageDir: d.storageDir,
      ...(d.onLog ? { onLog: d.onLog } : {}),
    }),
  ]);
  return {
    vessel,
    assembly:         vessel.get<VesselCoreAssembly>(CAP.substrate)!,
    daemon:           vessel.get<VesselDaemonVm>(CAP.daemon)!,
    meshPalaceHandle: vessel.get<MeshPalaceComponent>(CAP.meshpalace)!.handle,
    readFace:         vessel.get<OracleReadFace>(CAP.readFace)!,
  };
}

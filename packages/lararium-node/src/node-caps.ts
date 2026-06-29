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
export function meshPalaceCap(deps: { repo: Repo; residency?: BagResidencyManager }): CapModule {
  return {
    id: CAP.meshpalace, requires: [CAP.substrate],
    build: async (resolve) => {
      const assembly = resolve<VesselCoreAssembly>(CAP.substrate);
      const handle   = deps.repo.create<MeshPalaceDoc>(emptyMeshPalaceDoc());
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
  readonly keel:       VesselRecipe;
  readonly repo:       Repo;
  readonly residency?: BagResidencyManager;
  readonly httpServer: Server;
  readonly signerSeed: Uint8Array;
  readonly storageDir: string;
  readonly onLog?:     (line: string) => void;
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
    meshPalaceCap({ repo: d.repo, ...(d.residency ? { residency: d.residency } : {}) }),
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

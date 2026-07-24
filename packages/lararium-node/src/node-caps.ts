/**
 * node-caps — the node vessel's #has-cap-stack, wired by the composable-keel engine.
 *
 * A vessel = a #has-cap-stack (the flat, dependency-blind set of cap-modules it HAS); `composeVessel`
 * reads the stack and topologically WIRES the live components, handing each a POLA-scoped resolver.
 * Vessel-TYPES are different STACKS, never feature-flags: a Herm is not "a node with wiki=false" — it
 * is a stack that never declares the wiki/pool caps, so nothing routes to them (blind by structure).
 *
 * The ISOMORPHIC carriage machinery (meshpalace + carriage caps, MeshSelf, the routing helpers) now
 * lives DOWN on the mesh floor (`@lararium/mesh` carriage-caps) so a BROWSER vessel composes the very
 * same caps. node-caps RE-EXPORTS them (existing importers keep resolving) and owns only the node-ONLY
 * `flowMapReadFaceCap` (the http disclosure wire) + the two node cap-stacks.
 *
 * Two node stacks ride here:
 *   - composeLararium — the FULL node, a granular #has-cap-stack wired by `composeCoreVessel`.
 *   - composeHerm — the Lares Viales / Herm: a wiki-LESS wayfarer composed UP from granular caps —
 *     substrate (the @oracle island + social plane) + the @daemon immune core + a writable @meshpalace
 *     FLOW-map + the read-face that serves it. NO wiki, NO pool. The @daemon STAYS (the immune core
 *     lives in both stacks); its registerBags simply omits the absent user-wiki bags — the decouple.
 *
 * Canon: lar:///ha.ka.ba/lararium/api/composable-keel · …/mesh/vessel-caps#lares-viales
 */

import type { Server } from "node:http";
import type { Repo, DocHandle } from "@automerge/automerge-repo";
import {
  composeVessel, type CapModule, type ComposedVessel,
  type MeshPalaceDoc,
  type VesselRecipe, type VesselCoreAssembly,
  type BagResidencyManager,
  // ── the lifted carriage machinery, now mesh-floor (re-exported below) ──
  CARRIAGE_CAP,
  meshPalaceCap, carriageCap, meshSelfSeed, type MeshSelf, type MeshPalaceComponent,
} from "@lararium/mesh";
import {
  composeCoreVessel, substrateCap, daemonCap, CORE_CAP,
  type DaemonCapDeps, type VesselDaemonVm,
} from "@lararium/tw5";
import { mountFlowMapReadFace, type OracleReadFace } from "./oracle-read-face.js";
import { mountBulbReadFace } from "./bulb-read-face.js";
import type { BulbArtifact } from "./bulb.js";

/**
 * RE-EXPORT the isomorphic carriage symbols from `@lararium/mesh` so existing node-side importers
 * (open-node-vessel, main.ts, carriage-cap.test) keep resolving from `./node-caps.js` after the lift.
 */
export {
  meshPalaceCap, carriageCap, discoverPeers, dampedRadius, incommensurablePullMs,
  deriveMeshSelf, deriveMeshLeaf, meshSelfDial, meshSelfSeed,
  type MeshSelf, type MeshPalaceComponent, type CarriageComponent,
} from "@lararium/mesh";

/**
 * The cap-ids that name a node cap-module in a #has-cap-stack. substrate + daemon ride the SHARED
 * core ids (CORE_CAP) so the herm stack wires the tw5-owned substrateCap/daemonCap; meshpalace +
 * carriage ride the mesh-floor CARRIAGE_CAP ids (by VALUE — the cap-handshake match); readFace is
 * node-owned (the http disclosure wire).
 */
export const CAP = {
  substrate:  CORE_CAP.substrate,
  daemon:     CORE_CAP.daemon,
  meshpalace: CARRIAGE_CAP.meshpalace,
  carriage:   CARRIAGE_CAP.carriage,
  readFace:   "read-face",
  bulb:       "bulb",
} as const;

// ── the node-ONLY cap: the http read-face that serves the @meshpalace FLOW-map ─────────────────────

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

// ── the node-ONLY BULB cap: the held cold-boot snapshot served by cid over the PUBLIC read-face ─────

/** bulb — HOLD a cold-boot snapshot (genesis seed + CAS + bootstrap, epoch-PINNED) and serve it by cid over the
 *  HTTP floor (`/bulb/*`), ALL-PUBLIC, alongside the FLOW-map read-face. A stranger pulls it + kindles their OWN
 *  sovereign hearth (serve FIRE, never KEY). Requires substrate only (it reads the held artifact, mints nothing). */
export function bulbCap(deps: {
  httpServer: Server; bulb: BulbArtifact; signerSeed: Uint8Array; storageDir: string; onLog?: (line: string) => void;
}): CapModule {
  return {
    id: CAP.bulb, requires: [CAP.substrate],
    build: async () => mountBulbReadFace({
      httpServer: deps.httpServer, bulb: deps.bulb, signerSeed: deps.signerSeed, storageDir: deps.storageDir,
      ...(deps.onLog ? { onLog: deps.onLog } : {}),
    }),
    dispose: (face) => (face as OracleReadFace).dispose(),
  };
}

// ── the two node cap-stacks ──────────────────────────────────────────────────────────────────────

/**
 * composeLararium — the FULL node, a REAL granular #has-cap-stack: `composeCoreVessel` wires the
 * six core caps (substrate → wikislot → daemon → wiki → pool → mount) the SHARED keel declares — no
 * delegating wrapper. Returns the VesselCoreResult directly (no `{vessel,core}` wrapper;
 * the caller reads `.core`). Behaviour stays verbatim: the topo-order reproduces the monolith.
 */
export const composeLararium = composeCoreVessel;

export interface HermStackDeps extends DaemonCapDeps {
  readonly keel:           VesselRecipe;
  readonly repo:           Repo;
  readonly residency?:     BagResidencyManager;
  readonly httpServer:     Server;
  readonly signerSeed:     Uint8Array;
  readonly storageDir:     string;
  /** This Herm's mesh standing — derived once via deriveMeshSelf. Present → it self-announces, self-peers,
   *  re-ranks by proximity + drifts r. Absent → a leaf that only carries what it pulls (no carriage dials). */
  readonly meshSelf?:      MeshSelf;
  readonly pullIntervalMs?: number;
  /** The HELD bulb this Herm serves by cid over the public floor. Absent → no `/bulb/*` face (a Herm with no
   *  genesis to hand). Present → a stranger pulls it + kindles their OWN sovereign hearth (serve fire, never key). */
  readonly bulb?:          BulbArtifact;
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
      ...(d.meshSelf ? { seed: meshSelfSeed(d.meshSelf), selfCoord: d.meshSelf.coord } : {}),
    }),
    carriageCap({
      peers: d.meshSelf?.peers ?? [],
      ...(d.pullIntervalMs !== undefined ? { pullIntervalMs: d.pullIntervalMs } : {}),
      nodeSeedHex: Buffer.from(d.signerSeed).toString("hex"),  // the node-id seeds its incommensurable cadence
      ...(d.meshSelf ? {
        ...(d.meshSelf.endpoint ? { selfEndpoint: d.meshSelf.endpoint } : {}), // absent → a leaf
        selfCoord:    d.meshSelf.coord,
        selfBearing:  d.meshSelf.bearing,
        ...(d.meshSelf.maxFanout !== undefined ? { maxFanout: d.meshSelf.maxFanout } : {}),
      } : {}),
      ...(d.onLog ? { onLog: d.onLog } : {}),
    }),
    flowMapReadFaceCap({
      httpServer: d.httpServer, signerSeed: d.signerSeed, storageDir: d.storageDir,
      ...(d.onLog ? { onLog: d.onLog } : {}),
    }),
    // The BULB face rides the SAME public floor (a distinct `/bulb/` prefix) — present only when the Herm HOLDS a
    // bulb to hand. All-public boot material on the OPEN path; never the @cad carriage (bulb ⊥ stolon, ledger #1).
    ...(d.bulb ? [bulbCap({
      httpServer: d.httpServer, bulb: d.bulb, signerSeed: d.signerSeed, storageDir: d.storageDir,
      ...(d.onLog ? { onLog: d.onLog } : {}),
    })] : []),
  ]);
  return {
    vessel,
    assembly:         vessel.get<VesselCoreAssembly>(CAP.substrate)!,
    daemon:           vessel.get<VesselDaemonVm>(CAP.daemon)!,
    meshPalaceHandle: vessel.get<MeshPalaceComponent>(CAP.meshpalace)!.handle,
    readFace:         vessel.get<OracleReadFace>(CAP.readFace)!,
  };
}

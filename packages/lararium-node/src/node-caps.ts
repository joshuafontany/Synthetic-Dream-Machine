/**
 * node-caps — the node vessel's #has-cap-stack, wired by the composable-keel engine.
 *
 * A vessel = a #has-cap-stack (the flat, dependency-blind set of cap-modules it HAS); `composeVessel`
 * reads the stack and topologically WIRES the live components, handing each a POLA-scoped resolver.
 * Vessel-kinds are different STACKS, never feature-flags, and the difference runs BASE-THEN-LIFT. The
 * composed stacks each vessel actually stands, measured at a live boot:
 *
 *   BASE      substrate · daemon · meshpalace · carriage · who-face   — every vessel that carries
 *   LIFT      wikislot · wiki · pool · mount                          — added when a FACE stands
 *   CROSSROADS  read-face · bulb                                      — added when an httpServer stands
 *
 * BASE + LIFT = a Lararium. BASE + CROSSROADS = a Herm. The three groups compose by what a vessel HOLDS
 * — a face, an http floor — never by a kind-flag it was labelled with. CROSSROADS belongs to the vessel
 * that serves an http floor rather than to the Herm as a kind: a hearth composes no read-face because
 * its opener hands it no server, and a browser leaf could hold no such thing at all.
 *
 * A stack that never declares the wiki/pool caps routes nothing to them (blind by structure, not flag).
 *
 * The ISOMORPHIC carriage machinery (meshpalace + carriage caps, MeshSelf, the routing helpers) now
 * lives DOWN on the mesh floor (`@lararium/mesh` carriage-caps) so a BROWSER vessel composes the very
 * same caps. node-caps RE-EXPORTS them (existing importers keep resolving) and owns only the node-ONLY
 * `flowMapReadFaceCap` (the http disclosure wire) + the two node cap-stacks.
 *
 * Two node stacks ride here:
 *   - composeHerm — BASE + CROSSROADS: substrate (the @oracle island + social plane), the @daemon immune
 *     core, the carriage pair (a writable @meshpalace FLOW-map + the puller that fills it), the read-face
 *     that serves that map, and — where a genesis stands to hand — the bulb. NO wiki, NO pool.
 *   - composeLararium — BASE + LIFT, wired by `composeCoreVessel` (wiki-slot, wiki, pool, mount); its
 *     opener composes the carriage pair alongside. The @daemon rides BOTH — the immune core, present
 *     from founding — and its registerBags omits the user-wiki bags where no wiki stands: the decouple.
 *
 * The carriage pair rides one shared builder (`carriageStack`, mesh floor), so the hearth, the Herm and
 * the browser leaf carry the SAME two caps and differ only in the mesh standing each hands in.
 *
 * Canon: lar:///ha.ka.ba/lararium/api/composable-keel · …/mesh/vessel-caps#lares-viales
 */

import type { Server } from "node:http";
import type { Repo } from "@automerge/automerge-repo";
import {
  composeVessel, type CapModule, type ComposedVessel,
  type VesselKeel, type VesselCoreAssembly,
  type BagStowage,
  // ── the lifted carriage machinery, now mesh-floor (re-exported below) ──
  CARRIAGE_CAP,
  carriageStack, type MeshSelf, type MeshPalaceComponent,
} from "@lararium/mesh";
import {
  composeCoreVessel, substrateCap, daemonCap, CORE_CAP,
  type DaemonCapDeps, type VesselDaemonVm,
} from "@lararium/tw5";
import { mountFlowMapReadFace, type OracleReadFace } from "./oracle-read-face.js";
import { mountBulbReadFace } from "./bulb-read-face.js";
import type { BulbArtifact } from "./bulb.js";

/**
 * The carriage symbols node-side callers reach through this one door — the same modules
 * `@lararium/mesh` declares, named here so a node importer has a single place to ask for the
 * carriage. Each name below has a caller; a symbol nothing reaches belongs in mesh alone.
 */
export {
  meshPalaceCap, carriageCap, carriageStack, discoverPeers, dampedRadius, incommensurablePullMs,
  deriveMeshSelf,
  type MeshSelf, type MeshPalaceComponent,
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

/** read-face — serves the @meshpalace PUBLIC FLOW-map over the HTTP server (the disclosure shore
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
 * composeLararium — a hearth: `composeCoreVessel` wires the caps a FACE lifts over the base course
 * every vessel carries, and the opener composes the carriage pair and the WHO plane alongside. A
 * REAL granular #has-cap-stack, never a delegating wrapper. Returns the VesselCoreResult directly.
 */
export const composeLararium = composeCoreVessel;

export interface HermStackDeps extends DaemonCapDeps {
  readonly keel:           VesselKeel;
  readonly repo:           Repo;
  readonly residency?:     BagStowage;
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
  /** Role caps composed ALONGSIDE the wayfarer stack — the same channel `composeCoreVessel` opens to the
   *  hearth and the leaf, so all three vessels differ ONLY by what their opener passes, never by a forked
   *  cap list. A parity gap can then only ever read as an extraCaps gap. */
  readonly extraCaps?:     readonly CapModule[];
  readonly onLog?:         (line: string) => void;
}

/**
 * The handles a composed Herm hands back. The composed vessel itself is the read-face over
 * everything else it built — `vessel.get(id)` reaches any cap by name — so this carries only what a
 * caller actually drives, and disposal runs through `vessel` in reverse build order.
 */
export interface ComposedHerm {
  readonly vessel:   ComposedVessel;
  readonly assembly: VesselCoreAssembly;
  readonly daemon:   VesselDaemonVm;
}

/**
 * composeHerm — the wiki-LESS wayfarer #has-cap-stack, BASE + CROSSROADS:
 * [substrate, daemon, meshpalace, carriage, read-face, (bulb), …extraCaps].
 * No wiki, no pool — blind to sovereign content by structure. The @daemon stays (the immune core);
 * its registerBags omits the absent user-wiki bags (the decouple the daemon-without-wiki finding
 * proved). The read-face serves the @meshpalace FLOW-map the carriage pair carries.
 */
export async function composeHerm(d: HermStackDeps): Promise<ComposedHerm> {
  const vessel = await composeVessel([
    substrateCap(d.keel),
    daemonCap(d),
    // The carriage rides UNCONDITIONALLY here, self or no self: the read-face below REQUIRES the
    // @meshpalace it projects, so a Herm that has met nobody still stands its map and serves an empty
    // one. That is what a crossroads IS before anyone passes.
    ...carriageStack({
      repo:        d.repo,
      nodeSeedHex: Buffer.from(d.signerSeed).toString("hex"),
      ...(d.residency ? { residency: d.residency } : {}),
      ...(d.meshSelf ? { self: d.meshSelf } : {}),
      ...(d.pullIntervalMs !== undefined ? { pullIntervalMs: d.pullIntervalMs } : {}),
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
    ...(d.extraCaps ?? []),
  ]);
  return {
    vessel,
    assembly: vessel.get<VesselCoreAssembly>(CAP.substrate)!,
    daemon:   vessel.get<VesselDaemonVm>(CAP.daemon)!,
  };
}

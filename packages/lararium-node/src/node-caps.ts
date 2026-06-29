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
  AutomergeDocStore,
  MESH_PALACE_BAG, emptyMeshPalaceDoc, type MeshPalaceDoc,
  pullAndVerifyOracle, dialEntryToRecord, type DialEntry, type LarTiddlerRecord,
  type VesselRecipe, type VesselCoreAssembly,
  type BagResidencyManager,
} from "@lararium/mesh";
import {
  composeCoreVessel, substrateCap, daemonCap, CORE_CAP,
  type DaemonCapDeps, type VesselDaemonVm,
} from "@lararium/tw5";
import { mountFlowMapReadFace, type OracleReadFace } from "./oracle-read-face.js";

/**
 * The cap-ids that name a node cap-module in a #has-cap-stack. substrate + daemon ride the SHARED
 * core ids (CORE_CAP) so the herm stack wires the tw5-owned substrateCap/daemonCap; the rest name
 * the Herm-only caps node-caps owns.
 */
export const CAP = {
  substrate:  CORE_CAP.substrate,
  daemon:     CORE_CAP.daemon,
  meshpalace: "meshpalace",
  carriage:   "carriage",
  readFace:   "read-face",
} as const;

// ── Herm-only granular caps (substrate + daemon ride the SHARED tw5-owned caps; these are node's
//    own: a writable @meshpalace FLOW-map, the carriage that pulls peers, the read-face wire) ─────

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
const PHI_INV = 0.6180339887498949;
/**
 * FFZ mesh-timing axis-2 (lar:///ha.ka.ba/@lararium/mesh/ffz-mesh-timing #axis-desync): a per-node
 * INCOMMENSURABLE, renewal-randomized pull delay — NEVER a global fixed interval. A synchronized
 * global cadence is the herd / single point of failure: multi-node FlipIt proves it strictly dominated
 * (one timing-model predicts every node's window at once). The DETERMINISTIC factor golden-rotates a
 * hash of the node-id (coordination-free, mutually-irrational across node-ids — no shared entropy); the
 * JITTER randomizes each interval's realization (the secret phase — a predictable phase is the exploit,
 * not the rate). Constants PROVISIONAL/seeded, awaiting the mesh's live witness (the canon's open fork).
 */
export function incommensurablePullMs(seedHex: string, baseMs: number, rand: () => number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedHex.length; i++) h = Math.imul(h ^ seedHex.charCodeAt(i), 16777619) >>> 0;
  const factor = 0.7 + ((h * PHI_INV) % 1) * 0.6;   // per-node incommensurable mean-multiplier ~[0.7,1.3]
  const jitter = 0.75 + rand() * 0.5;               // renewal realization ~[0.75,1.25] (the secret phase)
  return Math.max(250, Math.round(baseMs * factor * jitter));
}

export interface CarriageComponent { readonly pullOnce: () => Promise<number>; readonly stop: () => void; }

/** carriage — the blind relay: pull each peer's PUBLIC FLOW-map (pullAndVerifyOracle) and merge it into
 *  this vessel's @meshpalace, re-served by the read-face (carry-by-aggregate-reserve). A peer down is no
 *  error — feed-or-fade. Requires meshpalace (the doc to merge into). Empty peers = a no-op (a leaf). */
export function carriageCap(deps: { peers: readonly string[]; pullIntervalMs?: number; nodeSeedHex?: string; onLog?: (line: string) => void }): CapModule {
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
      // FFZ axis-2: self-reschedule on a per-node INCOMMENSURABLE, renewal-randomized cadence (never a
      // global fixed interval — the herd is the single point of failure). Each interval is drawn fresh.
      const baseMs = deps.pullIntervalMs ?? 30_000;
      const seed = deps.nodeSeedHex ?? "leaf";
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const schedule = (): void => {
        if (stopped) return;
        timer = setTimeout(() => { void pullOnce().finally(schedule); }, incommensurablePullMs(seed, baseMs, Math.random));
        timer.unref();
      };
      void pullOnce().finally(schedule); // carry from the first breath, then self-reschedule incommensurably
      return { pullOnce, stop: () => { stopped = true; if (timer) clearTimeout(timer); } };
    },
    dispose: (c) => (c as CarriageComponent).stop(),
  };
}

// ── the two node cap-stacks ──────────────────────────────────────────────────────────────────────

/**
 * composeLararium — the FULL node, now a REAL granular #has-cap-stack: `composeCoreVessel` wires the
 * six core caps (substrate → wikislot → daemon → wiki → pool → mount) the SHARED keel declares — no
 * delegating wrapper. Returns the VesselCoreResult directly (the old `{vessel,core}` wrapper dropped;
 * the caller used only `.core`). Behaviour stays verbatim: the topo-order reproduces the monolith.
 */
export const composeLararium = composeCoreVessel;

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
      nodeSeedHex: Buffer.from(d.signerSeed).toString("hex"),  // the node-id seeds its incommensurable cadence
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

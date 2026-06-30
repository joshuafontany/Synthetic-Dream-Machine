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
  pullAndVerifyOracle, dialEntryToRecord, dialEntries, type DialEntry, type LarTiddlerRecord, type LarDoc,
  routingSlots, routingSlotToRecord, hyperbolicDistance, radialCoordinate, type Coord, type RoutingSlot,
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
export function meshPalaceCap(deps: { repo: Repo; residency?: BagResidencyManager; seed?: readonly DialEntry[]; selfCoord?: Coord }): CapModule {
  return {
    id: CAP.meshpalace, requires: [CAP.substrate],
    build: async (resolve) => {
      const assembly = resolve<VesselCoreAssembly>(CAP.substrate);
      const handle   = deps.repo.create<MeshPalaceDoc>(emptyMeshPalaceDoc());
      // Self-announce: a source Herm seeds its OWN dial(s) on the FLOW-map (public reachability — never
      // others' content), and — with a self-coord — a ROUTING-SLOT per dial so peers can re-rank toward
      // it on the hyperbolic chart. Absent = a leaf/relay that only carries what it pulls.
      if (deps.seed && deps.seed.length > 0) {
        handle.change((d) => {
          for (const e of deps.seed!) {
            const rec = dialEntryToRecord(e, "herm-self-announce");
            d.tiddlers[rec.tiddler.title] = rec;
            if (deps.selfCoord) {
              const slot: RoutingSlot = { bearing: e.bearing, r: deps.selfCoord.r, theta: deps.selfCoord.theta };
              const srec = routingSlotToRecord(slot, "herm-self-announce");
              d.tiddlers[srec.tiddler.title] = srec;
            }
          }
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

/**
 * Self-peering federation: the carriage discovers its pull-set from the FLOW-map's DIALS (each dial
 * advertises a reachable http read-face URL) UNION the bootstrap peers — so the mesh grows by the dials
 * it CARRIES (transitive discovery), never a hardcoded list. http(s) read-faces only (ws sync-endpoints
 * skipped); self excluded; deduped; bounded by maxFanout. With a `selfCoord`, the carried dials are
 * RE-RANKED by l-space proximity (the native `hyperbolicDistance` over published routing-slots — the
 * routing chart drives WHICH dials to carry, nearest first; the embedding's re-rank stage, native side).
 */
export function discoverPeers(
  doc: { tiddlers: Record<string, LarTiddlerRecord> } | undefined,
  bootstrap: readonly string[], selfEndpoint: string | undefined, maxFanout: number,
  selfCoord?: Coord,
): string[] {
  let dials = doc ? dialEntries(doc as LarDoc) : [];
  if (selfCoord && doc) {
    const coordOf = new Map<string, Coord>(routingSlots(doc as LarDoc).map((s) => [s.bearing, { r: s.r, theta: s.theta }]));
    const distOf = (bearing: string): number => {
      const c = coordOf.get(bearing);
      return c ? hyperbolicDistance(selfCoord, c) : Infinity; // a coordless dial ranks last
    };
    dials = [...dials].sort((a, b) => distOf(a.bearing) - distOf(b.bearing)); // nearest by the chart first
  }
  const peers: string[] = [];
  const seen = new Set<string>();
  for (const p of [...bootstrap, ...dials.map((d) => d.endpoint)]) { // bootstrap first, then nearest dials
    if (!p || p === selfEndpoint || !/^https?:\/\//.test(p) || seen.has(p)) continue; // http read-faces only
    seen.add(p);
    peers.push(p);
    if (peers.length >= maxFanout) break;
  }
  return peers;
}

const R_DISK = 8;     // the rim radius of the routing disk
const R_DAMP = 0.15;  // PSO-β low-pass (Vivaldi adaptive-step analogue) — slow, non-oscillating r-drift
const R_DEADBAND = 0.5; // re-publish the slot only when r drifts past this band (hysteresis)
/**
 * The carriage's radial standing damped from its LIVE degree (Krioukov `r = R−2·ln(κ/κ₀)` via
 * `radialCoordinate`). `r` DRIFTS (low-pass γ) toward the target, never snapping — the Chart-Diver's
 * stability layer (PSO-β popularity-fade) that keeps the degree→r→re-publish feedback from oscillating.
 * High-degree carriage hubs drift toward center, leaves to the rim; θ never feeds back (carved cones).
 */
export function dampedRadius(rCurrent: number, degree: number, gamma = R_DAMP): number {
  const rTarget = radialCoordinate(Math.max(1, degree), { R: R_DISK, minDegree: 1 });
  return (1 - gamma) * rCurrent + gamma * rTarget;
}

// ── MeshSelf — the ONE derived mesh self-dial (the 6-param sprawl collapsed) ──────────────────────

/**
 * A vessel's mesh standing — the single bundle the options layer carries (was six scattered params:
 * selfCoord, selfBearing, selfEndpoint, peers, maxFanout, seed). `composeHerm`/`openNodeVessel` unpack
 * it back into the caps' granular interface; the self-announce dial DERIVES from bearing + endpoint
 * (the old `seed` dissolved). Present → self-announce + self-peer + proximity re-rank + r-drift; absent
 * → a leaf that only carries what it pulls.
 */
export interface MeshSelf {
  /** OWN reachable http read-face URL — advertised in its dial, excluded from self-peering. */
  readonly endpoint: string;
  /** Own dial bearing — the slot the carriage re-publishes as its standing `r` drifts. */
  readonly bearing: string;
  readonly coord: Coord;                 // routing-chart coord (r=standing, θ=kinship), published in its slot
  readonly peers: readonly string[];     // bootstrap peer base URLs carried (∪ discovered dials); empty = a leaf
  readonly maxFanout?: number;           // max peers pulled per cycle
}

/** FNV-1a → [0,1): a content-blind unit hash of an address — the routing-chart θ + a fallback label. */
export function hashUnit(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return (h >>> 0) / 4294967296;
}

/**
 * deriveMeshSelf — the ONE mesh self-dial derivation (was duplicated across main.ts's two branches).
 * Every vessel is a NODE on the chart: θ = a content-blind FNV hash of the address, r = carriage standing
 * (`LAR_RADIUS`, default 1), bearing = `…/@oracle/node/<label>` (`LAR_SEED` label, else hash-derived).
 */
export function deriveMeshSelf(
  publicUrl: string, peers: readonly string[], opts: { label?: string; radius?: number } = {},
): MeshSelf {
  const u = hashUnit(publicUrl);
  const label = opts.label ?? u.toString(36).slice(2, 8);
  return {
    endpoint: publicUrl,
    bearing:  `lar:///ha.ka.ba/@oracle/node/${label}`,
    coord:    { theta: u * 2 * Math.PI, r: opts.radius ?? Number(process.env["LAR_RADIUS"] ?? 1) },
    peers,
  };
}

/** The self-announce dial a vessel seeds on its OWN FLOW-map — DERIVED from its MeshSelf (the `seed`
 *  param dissolved: bearing + endpoint ARE the dial; the placeholder key + dreamnet scale stay fixed). */
export function meshSelfDial(self: MeshSelf): DialEntry {
  return { bearing: self.bearing, verifyingKeyHex: "f".repeat(64), endpoint: self.endpoint, scale: "dreamnet" };
}

/** carriage — the blind relay: pull each PEER's PUBLIC FLOW-map (pullAndVerifyOracle) and merge it into
 *  this vessel's @meshpalace, re-served by the read-face (carry-by-aggregate-reserve). Peers are
 *  DISCOVERED from the carried dials (self-peering) ∪ the bootstrap. A peer down is no error —
 *  feed-or-fade. Requires meshpalace (the doc to merge into + discover dials from). */
export function carriageCap(deps: {
  peers: readonly string[]; pullIntervalMs?: number; nodeSeedHex?: string;
  selfEndpoint?: string; maxFanout?: number; selfCoord?: Coord; selfBearing?: string; onLog?: (line: string) => void;
}): CapModule {
  return {
    id: CAP.carriage, requires: [CAP.meshpalace],
    build: (resolve) => {
      const mp = resolve<MeshPalaceComponent>(CAP.meshpalace);
      const bootstrap = new Set(deps.peers);
      const seenDiscovered = new Set<string>();
      let rCurrent = deps.selfCoord?.r ?? 1; // the carriage's radial standing, low-pass damped from live degree
      let rPublished = rCurrent;
      const pullOnce = async (): Promise<number> => {
        let merged = 0;
        const peers = discoverPeers(mp.handle.doc(), deps.peers, deps.selfEndpoint, deps.maxFanout ?? 16, deps.selfCoord);
        // FFZ/Krioukov dynamic chart: damp r toward radialCoordinate(live-degree); re-publish the self-slot
        // ONLY past the deadband (hysteresis) — degree→r→re-publish never oscillates (PSO-β low-pass).
        if (deps.selfBearing && deps.selfCoord) {
          rCurrent = dampedRadius(rCurrent, peers.length);
          if (Math.abs(rCurrent - rPublished) > R_DEADBAND) {
            rPublished = rCurrent;
            const rec = routingSlotToRecord({ bearing: deps.selfBearing, r: rCurrent, theta: deps.selfCoord.theta }, "carriage-standing");
            mp.handle.change((d) => { d.tiddlers[rec.tiddler.title] = rec; });
            deps.onLog?.(`carriage: standing → r=${rCurrent.toFixed(2)} (degree ${peers.length}, past the band)`);
          }
        }
        for (const peer of peers) {
          if (!bootstrap.has(peer) && !seenDiscovered.has(peer)) {
            seenDiscovered.add(peer);
            deps.onLog?.(`carriage: self-peering discovered ${peer} from a carried dial`);
          }
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
  /** This Herm's mesh standing — derived once via deriveMeshSelf. Present → it self-announces, self-peers,
   *  re-ranks by proximity + drifts r. Absent → a leaf that only carries what it pulls (no carriage dials). */
  readonly meshSelf?:      MeshSelf;
  readonly pullIntervalMs?: number;
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
      ...(d.meshSelf ? { seed: [meshSelfDial(d.meshSelf)], selfCoord: d.meshSelf.coord } : {}),
    }),
    carriageCap({
      peers: d.meshSelf?.peers ?? [],
      ...(d.pullIntervalMs !== undefined ? { pullIntervalMs: d.pullIntervalMs } : {}),
      nodeSeedHex: Buffer.from(d.signerSeed).toString("hex"),  // the node-id seeds its incommensurable cadence
      ...(d.meshSelf ? {
        selfEndpoint: d.meshSelf.endpoint,
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
  ]);
  return {
    vessel,
    assembly:         vessel.get<VesselCoreAssembly>(CAP.substrate)!,
    daemon:           vessel.get<VesselDaemonVm>(CAP.daemon)!,
    meshPalaceHandle: vessel.get<MeshPalaceComponent>(CAP.meshpalace)!.handle,
    readFace:         vessel.get<OracleReadFace>(CAP.readFace)!,
  };
}

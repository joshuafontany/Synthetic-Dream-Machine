/**
 * carriage-caps — the ISOMORPHIC carriage machinery, lifted DOWN to the mesh floor.
 *
 * These caps wire a vessel's PUBLIC FLOW-map (@meshpalace) and the blind relay that carries it across
 * the astral space — platform-blind by construction (no node http Server, no tw5 wiki). A BROWSER vessel
 * composes the very same caps a node does; the node-side `node-caps` now RE-EXPORTS these so existing
 * importers keep resolving, and adds only the node-only `flowMapReadFaceCap` (the http disclosure wire).
 *
 * Layer law: `@lararium/mesh` is the LOWEST package — it CANNOT import `@lararium/tw5` (circular). So the
 * substrate cap-id rides here as a WIRE-STRING (`SUBSTRATE_CAP_ID`), matched by VALUE to tw5's
 * `CORE_CAP.substrate` at handshake time — cap-ids are handshake strings, matched by value, not by import.
 *
 * Canon: lar:///ha.ka.ba/@lararium/api/composable-keel · …/mesh/vessel-caps#lares-viales
 */

import type { Repo, DocHandle } from "@automerge/automerge-repo";
import type { CapModule } from "./cap-compose.js";
import { AutomergeDocStore } from "./automerge-doc-store.js";
import {
  MESH_PALACE_BAG, emptyMeshPalaceDoc, type MeshPalaceDoc,
  dialEntryToRecord, dialEntries, type DialEntry,
  routingSlots, routingSlotToRecord, hyperbolicDistance, radialCoordinate, type Coord, type RoutingSlot,
} from "./mesh-palace.js";
import { pullAndVerifyOracle } from "./oracle-read-client.js";
import type { LarTiddlerRecord } from "./tiddler-store.js";
import type { LarDoc } from "./base-doc.js";
import type { VesselCoreAssembly } from "./open-vessel-core.js";
import type { BagResidencyManager } from "./bag-residency.js";

/**
 * The carriage cap-ids. A vessel's #has-cap-stack names these to wire the @meshpalace FLOW-map + carriage.
 * The substrate dependency rides as a wire-string (below) — mesh cannot import tw5's CORE_CAP (circular),
 * so the value, not the symbol, carries the match. node-caps' `CAP` object folds these in.
 */
export const CARRIAGE_CAP = { meshpalace: "meshpalace", carriage: "carriage" } as const;

/** The substrate cap-id this carriage depends on — a WIRE-STRING. Matches tw5's `CORE_CAP.substrate` by
 *  VALUE (mesh can't import CORE_CAP — circular). cap-ids are handshake strings, matched by value. */
const SUBSTRATE_CAP_ID = "substrate";

// ── granular carriage caps (a writable @meshpalace FLOW-map + the carriage that pulls peers) ─────────

/** The composed @meshpalace handle a meshpalace cap exposes. */
export interface MeshPalaceComponent { readonly handle: DocHandle<MeshPalaceDoc>; }

/** meshpalace — a writable @meshpalace AutomergeDocStore layer (the vessel's own public FLOW-map) +
 *  a residency pin. Requires substrate (the composite to layer into). */
export function meshPalaceCap(deps: { repo: Repo; residency?: BagResidencyManager; seed?: readonly DialEntry[]; selfCoord?: Coord }): CapModule {
  return {
    id: CARRIAGE_CAP.meshpalace, requires: [SUBSTRATE_CAP_ID],
    build: async (resolve) => {
      const assembly = resolve<VesselCoreAssembly>(SUBSTRATE_CAP_ID);
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
  /** OWN reachable http read-face URL — advertised in its dial, excluded from self-peering. ABSENT → a
   *  LEAF: it carries-in (pulls + re-ranks by coord) but advertises no reachable dial, so it is NOT
   *  dial-able (a browser with no listening socket). The endpoint present-vs-absent IS the leaf↔full tier. */
  readonly endpoint?: string;
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

/**
 * deriveMeshLeaf — a LEAF mesh standing: carries-in (peers + a coord for the proximity re-rank) but
 * advertises NO endpoint, so it is not dial-able (a browser with no listening socket). `coordSeed` (the
 * vessel's own identifier — origin / relay URL) hashes to the chart coord + the leaf's bearing.
 */
export function deriveMeshLeaf(
  coordSeed: string, peers: readonly string[], opts: { radius?: number } = {},
): MeshSelf {
  const u = hashUnit(coordSeed);
  return {
    bearing: `lar:///ha.ka.ba/@oracle/leaf/${u.toString(36).slice(2, 8)}`,
    coord:   { theta: u * 2 * Math.PI, r: opts.radius ?? 1 },
    peers,
    // no endpoint → a LEAF (the Spore-Diver's one-field tier: carry-in only, not dial-able)
  };
}

/** The self-announce dial a vessel seeds on its OWN FLOW-map — DERIVED from its MeshSelf (the `seed`
 *  param dissolved: bearing + endpoint ARE the dial). A LEAF (no endpoint) has no dial → undefined. */
export function meshSelfDial(self: MeshSelf): DialEntry | undefined {
  if (!self.endpoint) return undefined; // a leaf advertises no reachable dial
  return { bearing: self.bearing, verifyingKeyHex: "f".repeat(64), endpoint: self.endpoint, scale: "dreamnet" };
}

/** The self-announce seed a caller hands `meshPalaceCap` — `[dial]` for a full node, `[]` for a leaf. */
export function meshSelfSeed(self: MeshSelf): readonly DialEntry[] {
  const dial = meshSelfDial(self);
  return dial ? [dial] : [];
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
    id: CARRIAGE_CAP.carriage, requires: [CARRIAGE_CAP.meshpalace],
    build: (resolve) => {
      const mp = resolve<MeshPalaceComponent>(CARRIAGE_CAP.meshpalace);
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

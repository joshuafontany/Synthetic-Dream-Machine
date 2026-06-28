/**
 * mesh-palace — the federated FLOW-map store: a vessel's view of WHO carries,
 * WHERE to dial, and WHICH region of l-space a peer sits in.
 *
 * The mesh-palace is the MAP, never the territory (the private mempalace holds
 * the sealed territory; this holds the coarse public chart). It carries three
 * kinds of record, all `LarDoc` tiddlers in the `@meshpalace` bag:
 *
 *   · dial-records  — a `lar:` bearing → self-certifying key + dial-able endpoint
 *                     (the SE(3) pose's translation vector; FLOW-only, WHO held off).
 *   · vessel cap-stacks — `(vesselId, held-caps, expressed-caps)` (the ECS shape:
 *                     a vessel IS its caps; role emerges; canon `mesh/vessel-caps`).
 *   · routing slots — `(bearing, r, θ)` — carriage-standing `r` (FLOW) + coarse
 *                     declared kinship `θ` (the greedy-routing chart coordinate).
 *
 * The PUBLIC read-face rides the Two-Faced Substrate (oracle-substrate): an
 * immutable content-addressed snapshot + a signed monotone pointer. The
 * disclosure membrane (`publicFlowMap`) filters the doc to only the coarse,
 * public, FLOW-plane tiddlers BEFORE the snapshot crosses to peers — so the map
 * federates where the private territory never could.
 *
 * Pure core (isomorphic, no I/O), hardened like oracle-substrate: decode NEVER
 * throws on untrusted input; it returns null.
 *
 * Canon:
 *   lar:///ha.ka.ba/@lararium/mesh/vessel-caps   (the five-cap model)
 *   lar:///ha.ka.ba/@lararium/mesh/dreamnet-architecture#node-addressing
 *   lar:///ha.ka.ba/@lararium/mesh/dreamnet-architecture#the-routing-substrate
 * Meme: lar:///ha.ka.ba/@lararium/mesh/mesh-palace
 */

import { from as automergeFrom, type Doc } from "@automerge/automerge";
import type { DocHandle } from "@automerge/automerge-repo";
import type { LarDoc } from "./base-doc.js";
import { mutableLarRecord } from "./base-doc.js";
import type { LarTiddlerRecord } from "./tiddler-store.js";
import { stableLarUri, type MeshScale } from "./lar-uris.js";
import {
  type OracleSnapshot,
  type OraclePointer,
  type PointerVerdict,
  exportOracleSnapshot,
  buildOraclePointer,
  verifyOraclePointer,
} from "./oracle-substrate.js";

// ── The cap vocabulary (canon: mesh/vessel-caps) ──────────────────────────
// Five capability verbs in two families crossing AUTHORITY ⊥ FLOW. A vessel
// HOLDS caps and EXPRESSES a subset; role emerges, never a type-tag.

/** CARRIAGE family — FLOW / connection (the rhizome). */
export const CARRIAGE_CAPS = ["rhizome", "stolon"] as const;
/** VESSEL family — AUTHORITY / sovereignty + state (the tuber). */
export const VESSEL_CAPS = ["tuber", "bulb", "corm"] as const;

export type CarriageCap = (typeof CARRIAGE_CAPS)[number];
export type VesselCap = (typeof VESSEL_CAPS)[number];
export type Cap = CarriageCap | VesselCap;

export const ALL_CAPS: readonly Cap[] = [...CARRIAGE_CAPS, ...VESSEL_CAPS];

export function isCarriageCap(c: string): c is CarriageCap {
  return (CARRIAGE_CAPS as readonly string[]).includes(c);
}
export function isVesselCap(c: string): c is VesselCap {
  return (VESSEL_CAPS as readonly string[]).includes(c);
}
export function isCap(c: string): c is Cap {
  return isCarriageCap(c) || isVesselCap(c);
}

/**
 * The wire-cap vocabulary — named caps advertised in the handshake (BEP-10
 * shape: named cap → peer-local handle, unknown silently ignored). Each retro-
 * names existing machinery; the gloss is the role the cap unlocks.
 */
export const WIRE_CAPS = {
  "rhizome.forward": "carriage: forward sealed bytes blind (the relay/leyline)",
  "stolon.admit":    "carriage: deploy/admit a remote vessel (device-admit, then wither)",
  "tuber.author":    "vessel: author sovereign causal state",
  "tuber.store":     "vessel: hold sovereign state + genesis-buds (the lararium)",
  "bulb.seed":       "vessel: carry a boot-seed snapshot, next-gen inside (cacheable genesis)",
  "corm.renew":      "vessel: renew-by-self-replacement (the epoch-lease)",
} as const;

export type WireCap = keyof typeof WIRE_CAPS;

// ── The bag + URI builders ─────────────────────────────────────────────────

/** The mesh-palace bag — `lar:///ha.ka.ba/@meshpalace`. */
export const MESH_PALACE_BAG = stableLarUri("@meshpalace");

/** A bearing → a filesystem-safe slug for a dial/route tiddler title. */
export function bearingSlug(bearing: string): string {
  return bearing.replace(/^lar:\/\/\/?/, "").replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export function dialUri(bearing: string): string {
  return `${MESH_PALACE_BAG}/dial/${bearingSlug(bearing)}`;
}
export function vesselUri(vesselId: string): string {
  return `${MESH_PALACE_BAG}/vessels/${vesselId.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
}
export function routeUri(bearing: string): string {
  return `${MESH_PALACE_BAG}/routes/${bearingSlug(bearing)}`;
}

// ── The three record kinds ─────────────────────────────────────────────────

/**
 * A dial-record — keyed by a stable `lar:` bearing, resolving to the mutable
 * endpoint. FLOW-only: it carries WHERE to dial and the key that signs the
 * pose, never WHO-may-read (that rides Keyhive on its own plane).
 */
export interface DialEntry {
  /** the stable bearing this record resolves (the SE(3) attitude). */
  readonly bearing: string;
  /** ed25519 verifying-key hex — the self-certifying key (the pose's identity). */
  readonly verifyingKeyHex: string;
  /** the resolved dial target — ws:// url, relay-url, or peer id. */
  readonly endpoint: string;
  /** federation grade — how far this record crosses (the residency axis). */
  readonly scale?: MeshScale;
  /** lease ms-epoch — re-published before it lapses (the `ea`-pulse / FFZ decay). */
  readonly expiry?: number;
}

/**
 * A vessel as its cap-stack — the ECS shape `(id, held, expressed)`. `held` is
 * the genome (caps the vessel carries); `expressed` is the lit subset it
 * advertises now (hold-vs-express). Carriage self-elects: a vessel expresses a
 * carriage wire-cap only when its capacity crosses threshold.
 */
export interface VesselCapStack {
  readonly vesselId: string;
  /** caps held (the genome). */
  readonly held: readonly Cap[];
  /** wire-caps expressed now (advertised in the handshake). */
  readonly expressed: readonly WireCap[];
}

/**
 * A routing slot — a vessel's coordinate on the greedy-routing chart. `r` =
 * carriage-standing (FLOW, radial); `theta` = coarse declared kinship (the
 * bounded cyclic S¹). The chart is a map, never the territory — coarse by
 * design so it leaks no sealed content.
 */
export interface RoutingSlot {
  readonly bearing: string;
  readonly r: number;
  readonly theta: number;
}

// ── Encode → LarDoc tiddler records ────────────────────────────────────────
// LarDoc tiddler fields are strings; numbers/arrays serialize to strings.

export function dialEntryToRecord(e: DialEntry, authority: string): LarTiddlerRecord {
  return mutableLarRecord(dialUri(e.bearing), {
    kind: "dial",
    bearing: e.bearing,
    verifyingKey: e.verifyingKeyHex,
    endpoint: e.endpoint,
    scale: e.scale ?? "",
    expiry: e.expiry !== undefined ? String(e.expiry) : "",
  }, authority);
}

export function vesselCapStackToRecord(v: VesselCapStack, authority: string): LarTiddlerRecord {
  return mutableLarRecord(vesselUri(v.vesselId), {
    kind: "vessel",
    vesselId: v.vesselId,
    held: v.held.join(" "),
    expressed: v.expressed.join(" "),
  }, authority);
}

export function routingSlotToRecord(s: RoutingSlot, authority: string): LarTiddlerRecord {
  return mutableLarRecord(routeUri(s.bearing), {
    kind: "route",
    bearing: s.bearing,
    r: String(s.r),
    theta: String(s.theta),
  }, authority);
}

// ── Decode ← LarDoc tiddler records (hardened: never throws, returns null) ──

function strField(rec: LarTiddlerRecord, key: string): string | undefined {
  const v = (rec.tiddler as Record<string, unknown>)[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

function numField(rec: LarTiddlerRecord, key: string): number | undefined {
  const s = strField(rec, key);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function recordToDialEntry(rec: LarTiddlerRecord | null | undefined): DialEntry | null {
  if (!rec || strField(rec, "kind") !== "dial") return null;
  const bearing = strField(rec, "bearing");
  const verifyingKeyHex = strField(rec, "verifyingKey");
  const endpoint = strField(rec, "endpoint");
  if (!bearing || !verifyingKeyHex || !endpoint) return null;
  const scaleRaw = strField(rec, "scale");
  const expiry = numField(rec, "expiry");
  return {
    bearing,
    verifyingKeyHex,
    endpoint,
    ...(scaleRaw ? { scale: scaleRaw as MeshScale } : {}),
    ...(expiry !== undefined ? { expiry } : {}),
  };
}

export function recordToVesselCapStack(rec: LarTiddlerRecord | null | undefined): VesselCapStack | null {
  if (!rec || strField(rec, "kind") !== "vessel") return null;
  const vesselId = strField(rec, "vesselId");
  if (!vesselId) return null;
  const held = (strField(rec, "held") ?? "").split(/\s+/).filter(isCap);
  const expressed = (strField(rec, "expressed") ?? "")
    .split(/\s+/)
    .filter((c): c is WireCap => c in WIRE_CAPS);
  return { vesselId, held, expressed };
}

export function recordToRoutingSlot(rec: LarTiddlerRecord | null | undefined): RoutingSlot | null {
  if (!rec || strField(rec, "kind") !== "route") return null;
  const bearing = strField(rec, "bearing");
  const r = numField(rec, "r");
  const theta = numField(rec, "theta");
  if (!bearing || r === undefined || theta === undefined) return null;
  return { bearing, r, theta };
}

// ── Read the whole sheet off a LarDoc ──────────────────────────────────────

export function dialEntries(doc: LarDoc): DialEntry[] {
  return Object.values(doc.tiddlers).map(recordToDialEntry).filter((e): e is DialEntry => e !== null);
}
export function vesselCapStacks(doc: LarDoc): VesselCapStack[] {
  return Object.values(doc.tiddlers).map(recordToVesselCapStack).filter((v): v is VesselCapStack => v !== null);
}
export function routingSlots(doc: LarDoc): RoutingSlot[] {
  return Object.values(doc.tiddlers).map(recordToRoutingSlot).filter((s): s is RoutingSlot => s !== null);
}

// ── Greedy geometric routing (the native-disk chart) ───────────────────────
// The routing-substrate canon (dreamnet-architecture#the-routing-substrate): a relay greedy-walks
// toward the neighbor closest in (r, θ) within a local horizon, and direct-dials beyond it. These
// pure helpers carry the chart math — the hyperbolic distance on the native polar disk + the greedy
// next-hop. The chart is a MAP, never the territory: r = carriage-standing (FLOW), θ = coarse public
// kinship (a bounded cyclic S¹). Long-range distance over-reads (non-Riemannian), so a null next-hop
// (no neighbor makes progress) signals the caller to direct-dial — never a dead end.

/** A point on the routing chart: radial standing r ≥ 0, angular kinship θ on the cyclic S¹. */
export interface Coord {
  readonly r: number;
  readonly theta: number;
}

const TAU = 2 * Math.PI;

/** Angular separation Δθ ∈ [0, π] on the cyclic θ circle (period 2π). */
export function angularSeparation(t1: number, t2: number): number {
  const d = Math.abs(t1 - t2) % TAU;
  return d > Math.PI ? TAU - d : d;
}

/** Hyperbolic distance on the native polar disk (H², curvature −1) — the hyperbolic law of cosines. */
export function hyperbolicDistance(a: Coord, b: Coord): number {
  const dTheta = angularSeparation(a.theta, b.theta);
  // cosh d = cosh r₁ cosh r₂ − sinh r₁ sinh r₂ cos Δθ
  const coshD = Math.cosh(a.r) * Math.cosh(b.r) - Math.sinh(a.r) * Math.sinh(b.r) * Math.cos(dTheta);
  return Math.acosh(Math.max(1, coshD)); // clamp ≥ 1 — float guard on acosh's domain
}

/**
 * Greedy next hop: the neighbor strictly closer to `dest` than `self` (the one that makes progress).
 * Returns null at a local minimum — no neighbor improves on self — which the caller reads as
 * "direct-dial beyond the horizon" (the dial-record), per #the-routing-substrate; never a dead end.
 */
export function greedyNextHop(self: Coord, neighbors: readonly RoutingSlot[], dest: Coord): RoutingSlot | null {
  let best: RoutingSlot | null = null;
  let bestDist = hyperbolicDistance(self, dest); // a hop must beat self to count as progress
  for (const n of neighbors) {
    const d = hyperbolicDistance(n, dest);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  return best;
}

// ── The disclosure membrane ────────────────────────────────────────────────
// Only PUBLIC, COARSE, FLOW-plane tiddlers cross to peers. The membrane is the
// map/territory boundary made into a filter: dial-records + routing slots are
// the coarse public FLOW-map; vessel held-caps stay local unless explicitly
// expressed. A record is public when it carries `scale = "cabal" | "nexus" |
// "dreamnet"` (federating) — vessel-local + persona-group records never cross.

const PUBLIC_SCALES: readonly MeshScale[] = ["cabal", "nexus", "dreamnet"];

function crossesMembrane(rec: LarTiddlerRecord): boolean {
  const kind = strField(rec, "kind");
  if (kind === "route") return true;                       // routing coords are coarse public by design
  if (kind === "dial") {
    const scale = strField(rec, "scale");
    return scale !== undefined && (PUBLIC_SCALES as readonly string[]).includes(scale);
  }
  return false;                                            // vessel cap-stacks stay local (held ≠ advertised)
}

/**
 * Project the mesh-palace doc to its public FLOW-map — the coarse subset that
 * crosses the disclosure membrane. The result is a `LarDoc` ready to snapshot;
 * the private territory (vessel-local dial-records, held caps) never enters it.
 */
export function publicFlowMap(doc: LarDoc): LarDoc {
  const tiddlers: Record<string, LarTiddlerRecord> = {};
  for (const [title, rec] of Object.entries(doc.tiddlers)) {
    if (crossesMembrane(rec)) tiddlers[title] = rec;
  }
  return { schemaVersion: doc.schemaVersion, tiddlers };
}

// ── The Two-Faced public read-face (rides oracle-substrate) ────────────────
// The mesh-palace publishes its public FLOW-map exactly as @oracle publishes
// its corpus: an immutable content-addressed snapshot + a signed monotone
// pointer. A peer pulls the pointer, verifies (anti-rollback · anti-equivocation
// · freshness · rehash), then fetches the snapshot by cid.

export type {
  OracleSnapshot as FlowMapSnapshot,
  OraclePointer as FlowMapPointer,
  PointerVerdict as FlowMapVerdict,
};

/** Load a plain LarDoc projection into a fresh Automerge doc (A.from rejects the readonly interface). */
function loadDoc(d: LarDoc): Doc<Record<string, unknown>> {
  return automergeFrom(d as unknown as Record<string, unknown>);
}

/** Snapshot a mesh-palace doc's PUBLIC FLOW-map (membrane applied) as a content-addressed read-face. */
export function snapshotPublicFlowMap(palaceDoc: LarDoc): Promise<OracleSnapshot> {
  return exportOracleSnapshot(loadDoc(publicFlowMap(palaceDoc)));
}

/** Export an already-loaded FLOW-map Doc as a snapshot (generic passthrough). */
export function exportFlowMapSnapshot<T>(doc: Doc<T>): Promise<OracleSnapshot> {
  return exportOracleSnapshot(doc);
}

/** Build + sign the monotone pointer to a FLOW-map snapshot. */
export const buildFlowMapPointer = buildOraclePointer;

/** The reader rule for a peer's FLOW-map pointer (never throws — returns a verdict). */
export const verifyFlowMapPointer = verifyOraclePointer;

// ── The live surface — a DocHandle-bound read/write over the pure core ─────
// Writes go through `handle.change()`, reads off `handle.doc()`. The pure
// functions above stay the contract; this is the thin stateful skin a vessel
// holds. A `MeshPalaceDoc` is just a `LarDoc` (the bag is its own Automerge doc).

export type MeshPalaceDoc = LarDoc;

export function emptyMeshPalaceDoc(): MeshPalaceDoc {
  return { schemaVersion: "0.1", tiddlers: {} };
}

export class MeshPalace {
  constructor(
    private readonly handle: DocHandle<MeshPalaceDoc>,
    private readonly authority: string,
  ) {}

  private current(): MeshPalaceDoc {
    return this.handle.doc() ?? emptyMeshPalaceDoc();
  }

  private write(rec: LarTiddlerRecord): void {
    this.handle.change((d) => { d.tiddlers[rec.tiddler.title] = rec; });
  }

  /** Register/refresh a dial-record (a bearing → key + endpoint resolution). */
  putDial(e: DialEntry): void { this.write(dialEntryToRecord(e, this.authority)); }
  /** Register/refresh a vessel's cap-stack (held ⊕ expressed). */
  putVessel(v: VesselCapStack): void { this.write(vesselCapStackToRecord(v, this.authority)); }
  /** Register/refresh a routing slot (r, θ). */
  putRoute(s: RoutingSlot): void { this.write(routingSlotToRecord(s, this.authority)); }

  /** Resolve one bearing to its dial-record, or null when unknown. */
  getDial(bearing: string): DialEntry | null {
    return recordToDialEntry(this.current().tiddlers[dialUri(bearing)]);
  }

  dials():   DialEntry[]      { return dialEntries(this.current()); }
  vessels(): VesselCapStack[] { return vesselCapStacks(this.current()); }
  routes():  RoutingSlot[]    { return routingSlots(this.current()); }

  /** The public projection — only what crosses the disclosure membrane (coarse FLOW). */
  publicProjection(): MeshPalaceDoc { return publicFlowMap(this.current()); }

  /** Export the public FLOW-map as a content-addressed snapshot (the read-face). */
  exportPublicSnapshot(): Promise<OracleSnapshot> {
    return snapshotPublicFlowMap(this.current());
  }
}

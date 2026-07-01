/**
 * memetic-wikitext-sensorium — the CONCRETE instance of the neither-top, co-located-peers design.
 *
 * A nameless nested entity that `#has` TWO PEER sub-sensoria — FORMAL (memes-on-disk = grammar/liturgy)
 * ⋈ INFORMAL (chat-sessions = pidgin) — with NEITHER on top: the top manifest carries them as
 * `coupling.children=[formal, informal]`, and the base-cap coupling plane reads the DIRECTED formal↔
 * informal flow (does liturgy inform chat, or chat crystallize into liturgy? — both directions, neither
 * assumed) through the mesh keel's `coupleMesh` (whiten → couple → χ²-gate). This module CALLS that keel;
 * it never re-derives it.
 *
 * THE FRACTAL (the load-bearing insight): the same neither-top, co-located-peers pattern recurs at TWO
 * scales — (a) STRATUM: red-sigil-register ⋈ black-prose co-located within ONE text (skeletal tier +
 * association graph); (b) CORPUS: formal ⋈ informal co-located across texts (the peer sub-sensoria +
 * coupling edge). ONE structure serves both: {@link coupleStreams} is the shared coupler; the reader
 * written for the stratum ({@link channelSignals}) is the shape composed for the corpus
 * ({@link corpusSignals}).
 *
 * THE READER (crucible: NO new parser): the meme-ast island scanner (`collectEvents`, disjoint-match) +
 * a tree-sitter INJECTION config ({@link sigilInjectionQuery}) + a source-CID-pinned STANDOFF stratum
 * table (per byte-range `{span, tag, sourceCid}`). Strata ASSOCIATE to a SKELETAL TIER (the prose/char
 * stream) via association edges — autosegmental, NOT position-identity.
 *
 * TWO AXES: span (the aperture ladder — {@link bandForSpanLength}) × channel (red/black/base — a
 * categorical classifier). A control-sigil at fine grain reads as a CROSS-BAND signal (its own span-band
 * stays fine while it associates to a coarse anchor), never forced to the outer band.
 *
 * THE LI/KI SPLIT (理/氣): content/structure/form sense the LI (pattern — {@link readLi}); bands/coupling
 * sense the KI (flow — {@link readKi}).
 *
 * Meme: lar:///ha.ka.ba/@lares/api/lares/memetic-wikitext-sensorium
 */

import { createHash } from "node:crypto";
import { collectEvents } from "@lararium/tw5/meme-ast";
import {
  type MeshCoupling,
  windowInit, windowPush, windowLengthFor, type WindowConfig, type WindowState,
  linearityGate, type LinearityReading,
  ffzMembershipAddress, ffzTruncate, type FfzCells,
} from "@lararium/mesh";
import { buildSensoriumManifest, type SensoriumManifest, type SensoriumBands } from "./sensorium.js";
import { FFZ_ADDRESS_ORDER, type FfzBand } from "@lararium/mesh";

// ── the two axes ─────────────────────────────────────────────────────────────────────────────────

/** The channel axis — a CATEGORICAL classifier, never a scale (the fractal's stratum-scale peers + base). */
export type ChannelTag = "black" | "red" | "base";

/** The four Mu wildcard operators — the `base` channel's 4-valued refinement (`* ? ! _`). */
export type MuOp = "*" | "?" | "!" | "_";

/**
 * The span axis — a length→aperture-band map (coarse→fine grain by byte-range size). The thresholds seat
 * the five bands so an inline control-sigil (~30 chars) reads Pulse while a paragraph (~250 chars) reads
 * Measure/Arc — the contrast the cross-band proof rides. Char length, never a phase.
 */
export const SPAN_BAND_MAX: ReadonlyArray<readonly [FfzBand, number]> = [
  ["Pulse", 40],       // an inline atom / token
  ["Beat", 120],       // a clause
  ["Measure", 400],    // a paragraph
  ["Arc", 1200],       // a section
  // ["Theme", ∞]      // a whole document
];

/** Map a stratum's byte-length to its aperture SPAN band (Pulse..Theme). Fine→coarse by size. */
export function bandForSpanLength(len: number): FfzBand {
  for (const [band, max] of SPAN_BAND_MAX) {
    if (len < max) return band;
  }
  return "Theme";
}

// ── the standoff stratum table + skeletal tier + association graph ─────────────────────────────────

/** A source byte-range, half-open [start, end). */
export type Span = readonly [number, number];

/**
 * One STANDOFF stratum — a byte-range tagged on both axes, source-CID-pinned. Held BESIDE the text
 * (rust-analyzer style), never woven into it, so the same source can carry many strata tables.
 */
export interface Stratum {
  readonly span: Span;
  /** the channel axis — categorical (black prose · red control-sigil · base Mu-operator). */
  readonly channel: ChannelTag;
  /** the base-4 refinement when `channel === "base"` — the steering Mu operator. */
  readonly muOp?: MuOp;
  /** the sigil HEAD word (e.g. "confidence", "ward", "lares") — the association's typed-relation label. */
  readonly head: string;
  /** the span axis — the aperture band of this stratum's OWN byte-range. */
  readonly band: FfzBand;
  /** the content-address of the source this stratum indexes into (pins the table to its text). */
  readonly sourceCid: string;
}

/** One SKELETAL-tier anchor — a prose (black) region the strata associate onto. */
export interface SkeletalAnchor {
  readonly span: Span;
  /** the aperture band of this anchor's OWN byte-range. */
  readonly band: FfzBand;
}

/** The spread direction of an association — RIGHTWARD (marker-leads / seed-forward) is the default. */
export type SpreadDirection = "rightward" | "leftward";

/**
 * One AUTOSEGMENTAL association edge — a stratum links to a skeletal anchor WITHOUT being that anchor's
 * position (Goldsmith 1976). The edges form a TYPED OVERLAP MULTIGRAPH over one skeleton: `relation`
 * labels the link (confidence-line ≠ ward-line ≠ voice-line — distinct typed relations, never one
 * undifferentiated association). `direction` records the spread: control sigils SEED FORWARD, so the
 * default spreads RIGHTWARD (the marker leads, governing the prose that follows until a boundary or a
 * competing marker — textbook L-to-R spreading), falling LEFTWARD only where no following anchor exists.
 *
 * UNIT-ANCHORED (Goldsmith's Stability argument): the edge keys on skeletal-tier INDICES, never raw byte
 * offsets — so the red register SURVIVES a splice/rewrite of the black stream (the confidence/ward
 * autosegment re-docks) without an offset-drift re-projection tax. `crossBand` fires when the stratum's
 * span-band differs from its anchor's band: a fine control-signal on a coarse anchor reads CROSS-BAND.
 */
export interface AssociationEdge {
  readonly stratum: number;   // index into Stratification.strata (unit-anchored, not a byte offset)
  readonly anchor: number;    // index into Stratification.skeletal (unit-anchored, not a byte offset)
  /** the typed-relation label — the stratum's sigil head (the multigraph edge type). */
  readonly relation: string;
  /** the spread direction — rightward (marker-leads, default) or leftward (fallback). */
  readonly direction: SpreadDirection;
  readonly crossBand: boolean;
}

/** The full stratification of one memetic-wikitext source — the LI (pattern) face of the reader. */
export interface Stratification {
  readonly sourceCid: string;
  readonly skeletal: readonly SkeletalAnchor[];
  readonly strata: readonly Stratum[];
  readonly associations: readonly AssociationEdge[];
}

/** Content-address a source (sha-256, hex) — the pin every standoff stratum carries. */
export function sourceCidOf(text: string): string {
  return "sha256-" + createHash("sha256").update(text, "utf8").digest("hex");
}

/** Does a red span carry a bare Mu operator as its steering glyph? (`<<~ ward ! …`, `<<~ mu * …`). */
function detectMuOp(raw: string): MuOp | null {
  const m = /<<~\s*(?:ward|mu)\s+([*?!_])/.exec(raw);
  return m ? (m[1] as MuOp) : null;
}

/** The sigil HEAD word of a red span — the typed-relation label (`confidence`, `ward`, `lares`, …). */
export function sigilHead(raw: string): string {
  const m = /<<~\s*\/?\s*(\\?[A-Za-zऀ-ॿ][\w-]*)/.exec(raw);
  return m ? m[1]! : "(sigil)";
}

/** Merge event spans into DISJOINT red islands (position-dedup can still leave overlaps; we normalize). */
function disjointIslands(spans: Array<{ start: number; end: number; raw: string }>): Array<{ start: number; end: number; raw: string }> {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Array<{ start: number; end: number; raw: string }> = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) {
      // overlap — extend the island, keep the widest raw (the outer construct steers)
      if (s.end > last.end) { last.end = s.end; }
      continue;
    }
    out.push({ start: s.start, end: s.end, raw: s.raw });
  }
  return out;
}

/**
 * STRATIFY a memetic-wikitext source into the standoff table + skeletal tier + association graph.
 *
 * The island scanner ({@link collectEvents}) yields the disjoint `<<~…>>` islands (the RED classifier
 * register); the gaps between them are the BLACK skeletal anchors (the prose the red steers). Each red
 * stratum ASSOCIATES to the prose it governs — by the SEED-FORWARD / marker-leads law, the default spread
 * runs RIGHTWARD (the marker leads the claim that follows it, textbook L-to-R spreading), falling LEFTWARD
 * only where no following anchor exists. The edges form a TYPED OVERLAP MULTIGRAPH (labeled by sigil head)
 * and are UNIT-ANCHORED (skeletal indices, not byte offsets — stable under edits). `crossBand` fires where
 * a fine control-sigil docks on a coarse anchor. (Goldsmith 1976; Bird & Ellison 1994.)
 */
export function stratify(text: string, sourceCid: string = sourceCidOf(text)): Stratification {
  const events = collectEvents(text);
  const islands = disjointIslands(events.map((e) => ({ start: e.pos, end: e.end, raw: e.raw })));

  const strata: Stratum[] = [];
  const skeletal: SkeletalAnchor[] = [];

  // Walk the source: the gaps between islands are black anchors, the islands are red/base strata.
  let cursor = 0;
  const pushAnchor = (start: number, end: number): void => {
    if (end <= start) return;
    // A whitespace-only gap is not a real anchor (an inline sigil butts against prose with no gap).
    if (text.slice(start, end).trim() === "") return;
    skeletal.push({ span: [start, end], band: bandForSpanLength(end - start) });
  };
  for (const isl of islands) {
    pushAnchor(cursor, isl.start);
    const len = isl.end - isl.start;
    const muOp = detectMuOp(isl.raw);
    strata.push({
      span: [isl.start, isl.end],
      channel: muOp ? "base" : "red",
      ...(muOp ? { muOp } : {}),
      head: sigilHead(isl.raw),
      band: bandForSpanLength(len),
      sourceCid,
    });
    cursor = isl.end;
  }
  pushAnchor(cursor, text.length);

  // Autosegmental association (typed, unit-anchored): a control sigil SEEDS FORWARD, so each stratum
  // spreads RIGHTWARD onto the prose it governs — the nearest anchor starting on/after the stratum's end.
  // Where none exists (a trailing/closing sigil), it docks LEFTWARD onto the nearest preceding anchor.
  const associations: AssociationEdge[] = [];
  for (let si = 0; si < strata.length; si++) {
    const s = strata[si]!;
    let anchorIdx = -1;
    let direction: SpreadDirection = "rightward";
    // preferred (marker-leads): the nearest anchor starting on/after this stratum's end
    for (let ai = 0; ai < skeletal.length; ai++) {
      if (skeletal[ai]!.span[0] >= s.span[1]) { anchorIdx = ai; break; }
    }
    // fallback: the nearest anchor ending on/before this stratum's start (closing/trailing sigil)
    if (anchorIdx === -1) {
      direction = "leftward";
      for (let ai = skeletal.length - 1; ai >= 0; ai--) {
        if (skeletal[ai]!.span[1] <= s.span[0]) { anchorIdx = ai; break; }
      }
    }
    if (anchorIdx === -1) continue;   // a source that is ALL sigil, no prose — no association
    const anchor = skeletal[anchorIdx]!;
    associations.push({ stratum: si, anchor: anchorIdx, relation: s.head, direction, crossBand: s.band !== anchor.band });
  }

  return { sourceCid, skeletal, strata, associations };
}

// ── the tree-sitter injection config (documents disjoint-partition ≅ injection) ────────────────────

/** A tree-sitter injection descriptor — the outer (host) language and the injected (guest) language. */
export interface SigilInjection {
  /** the host language: memetic-wikitext prose (the BLACK skeletal tier). */
  readonly host: string;
  /** the guest language injected into the `<<~…>>` ranges (the RED sigil register). */
  readonly injected: string;
  /** the node type in the host grammar whose ranges receive the injection. */
  readonly rangeNode: string;
}

/** The canonical injection: sigil grammar into the sharktooth ranges of the memetic-wikitext host. */
export const SIGIL_INJECTION: SigilInjection = {
  host: "memetic_wikitext",
  injected: "lares_sigil",
  rangeNode: "sharktooth",
};

/**
 * Emit the tree-sitter injection query (`.scm`) that models the disjoint partition NATIVELY: the host
 * grammar's `<<~…>>` (sharktooth) nodes become injection ranges for the sigil grammar. Injections are the
 * tree-sitter-native shape for a disjoint region-partition — the same partition the island scanner reads
 * by disjoint-match. This is the config-of-record; the running reader uses the scanner, not a live parse.
 */
export function sigilInjectionQuery(inj: SigilInjection = SIGIL_INJECTION): string {
  return [
    `; injections.scm — ${inj.host} host, ${inj.injected} guest`,
    `; the <<~…>> (${inj.rangeNode}) ranges carry the RED sigil register; the gaps are the BLACK prose.`,
    `((${inj.rangeNode}) @injection.content`,
    ` (#set! injection.language "${inj.injected}"))`,
  ].join("\n");
}

// ── the KI: FFZ-aligned tick streams → the windowed-coupling runtime (the fractal atom) ─────────────
//
// "A system is what it does." — the fixed-window ordinal shortcut is GONE. The coupling reads run the
// parallel keel's STREAMING runtime (windowed-coupling: L-window · floor-warming · change-point reset ·
// hop) over a stream of ALIGNED TICKS, each tick one vector per child at a SHARED GRAIN. That grain is
// the FFZ rhythmic address — the runtime's own contract ("the worldline aligns upstream"). The reader
// only PRODUCES the aligned ticks + CALLS the runtime; it never re-derives windowing, reset, or coupling.

/** One ALIGNED tick — child i's vector at a shared-grain instant. Order matches the children names. */
export type AlignedTick = readonly (readonly number[])[];

/** Options for {@link coupleAligned} — the window policy (L auto-derived from d_joint) + the screen. */
export interface CoupleAlignedOptions {
  /** window length; default `windowLengthFor(d_joint, k)` — the estimator floor, never a magic number. */
  readonly L?: number;
  /** L = k · d_joint (k ∈ [15,20]; default 15). */
  readonly k?: number;
  readonly floor?: number;
  readonly hop?: number;
  readonly detectMin?: number;
  readonly changeThreshold?: number;
  readonly mergeThreshold?: number;
  readonly lag?: number;
  readonly alpha?: number;
  /** the Tier-0 linearity-gate thresholds (effect-size floors). */
  readonly linearity?: { gapDelta?: number; kurtFloor?: number };
}

/** The result of running the windowed runtime over a tick stream — the KI (氣, flow) reading. */
export interface AlignedCouplingRead {
  /** the last significance-clean coupling the runtime emitted, or null while warming / no shared grain. */
  readonly coupling: MeshCoupling | null;
  /** the final window is under-powered (too few aligned ticks, or just reset) → no trustworthy coupling. */
  readonly warming: boolean;
  /** filled samples in the final window. */
  readonly filled: number;
  /** change-point regime resets over the stream (each keeps a coupling inside ONE regime). */
  readonly resets: number;
  /** aligned ticks consumed (0 ⇒ no shared grain — the honest no-coupling, never fabricated). */
  readonly ticks: number;
  /** the Tier-0 linearity screen on the primary coupling channel (null when too few ticks / <2 children). */
  readonly linearity: LinearityReading | null;
  /** the screen's verdict: the Gaussian read leaves nonlinear signal on the table → escalate to KSG. */
  readonly escalate: boolean;
}

/**
 * The SHARED COUPLER (the fractal atom): run the parallel keel's {@link windowPush} runtime over an
 * ALIGNED TICK stream, then screen the primary channel with {@link linearityGate}. A THIN call — the
 * runtime owns window / warming / change-point-reset / hop / coupling; this only folds the stream and
 * reports. BOTH scales route through here — {@link readKiStratum} (red↔black) and {@link readKiCorpus}
 * (formal↔informal) — the same shape, one FFZ grain up.
 */
export function coupleAligned(
  children: readonly string[], ticks: readonly AlignedTick[], opts: CoupleAlignedOptions = {},
): AlignedCouplingRead {
  const first = ticks[0];
  const dJoint = first ? first.reduce((s, v) => s + v.length, 0) : Math.max(1, children.length);
  const L = opts.L ?? windowLengthFor(dJoint, opts.k ?? 15);
  const config: WindowConfig = {
    L,
    ...(opts.floor !== undefined ? { floor: opts.floor } : {}),
    ...(opts.hop !== undefined ? { hop: opts.hop } : {}),
    ...(opts.detectMin !== undefined ? { detectMin: opts.detectMin } : {}),
    ...(opts.changeThreshold !== undefined ? { changeThreshold: opts.changeThreshold } : {}),
    ...(opts.mergeThreshold !== undefined ? { mergeThreshold: opts.mergeThreshold } : {}),
    ...(opts.lag !== undefined ? { lag: opts.lag } : {}),
    ...(opts.alpha !== undefined ? { alpha: opts.alpha } : {}),
  };

  let state: WindowState = windowInit(children);
  let coupling: MeshCoupling | null = null;
  let warming = true;
  let filled = 0;
  let resets = 0;
  for (const tick of ticks) {
    const r = windowPush(state, tick, config);
    state = r.state;
    warming = r.out.warming;
    filled = r.out.filled;
    if (r.out.reset) resets++;
    if (r.out.coupling) coupling = r.out.coupling;
  }

  // Tier-0 screen on the PRIMARY coupling channel — the first dim of the first two children (the steering
  // red / the formal register). Never trust the Gaussian read past this without an escalate check.
  let linearity: LinearityReading | null = null;
  if (children.length >= 2 && ticks.length >= 8) {
    const x = ticks.map((t) => t[0]?.[0] ?? 0);
    const y = ticks.map((t) => t[1]?.[0] ?? 0);
    linearity = linearityGate(x, y, opts.linearity ?? {});
  }

  return { coupling, warming, filled, resets, ticks: ticks.length, linearity, escalate: linearity?.escalate ?? false };
}

// ── STRATUM scale: FFZ Pulse-grain ticks from one text ──────────────────────────────────────────────

/** The finest aperture cell (the Pulse band ceiling) — the FFZ inscription-atom grain a text is walked at. */
export const PULSE_GRAIN = 40;

/** The red-channel density over a byte cell [start, end) — the fraction of the cell the red strata cover. */
function cellRedFrac(strata: readonly Stratum[], start: number, end: number): number {
  const width = Math.max(1, end - start);
  let redChars = 0;
  for (const s of strata) {
    const os = Math.max(start, s.span[0]);
    const oe = Math.min(end, s.span[1]);
    if (oe > os) redChars += oe - os;
  }
  return redChars / width;
}

/**
 * Walk ONE text at the FFZ Pulse grain, emitting an aligned tick per cell: `[[redFrac], [blackFrac]]`.
 * The shared grain is the text's own reading order at the finest aperture cell; the runtime accumulates
 * L cells into a window and detects regime shifts (a section boundary) itself — no fixed pre-window.
 */
export function stratumTicks(text: string, grain = PULSE_GRAIN, strat: Stratification = stratify(text)): AlignedTick[] {
  const ticks: AlignedTick[] = [];
  const step = Math.max(1, grain);
  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(text.length, start + step);
    const red = cellRedFrac(strat.strata, start, end);
    ticks.push([[red], [1 - red]]);
  }
  return ticks;
}

/**
 * Read the STRATUM-scale KI: the red↔black directed coupling of one text, run through the windowed
 * runtime over Pulse-grain ticks. A short text yields fewer ticks than L ⇒ `warming` (the runtime
 * REFUSES to emit on under-powered data — the anti-false-sovereign behavior, honest by construction).
 */
export function readKiStratum(text: string, opts: CoupleAlignedOptions = {}): AlignedCouplingRead {
  return coupleAligned(["red", "black"], stratumTicks(text), opts);
}

// ── CORPUS scale: FFZ-address JOIN (no ordinal fakery) ──────────────────────────────────────────────

/** One FFZ-addressed cell — a vector at a rhythmic address. The address is the SHARED-GRAIN join key. */
export interface FfzCell {
  /** the cell's FFZ rhythmic address — a serialized string, or an {@link FfzCells} to serialize. */
  readonly ffz: string | FfzCells;
  /** the cell's feature vector at that address. */
  readonly vec: readonly number[];
}

/** Serialize a cell's FFZ address, optionally truncated to `band` coarse cells (the coupling grain). */
function ffzKey(cell: FfzCell, band?: number): string {
  const addr = typeof cell.ffz === "string" ? cell.ffz : ffzMembershipAddress(cell.ffz);
  return band !== undefined ? ffzTruncate(addr, band) : addr;
}

/**
 * JOIN two FFZ-addressed cell streams into aligned ticks — the ONLY sound cross-text alignment: a formal
 * cell pairs with an informal cell IFF they SHARE an FFZ address (the shared grain). Formal drives order;
 * a formal cell with no informal match at its address emits NO tick. No shared address ⇒ no ticks ⇒ the
 * runtime warms and emits nothing (the honest no-coupling — never the ordinal fabrication that was here).
 */
export function ffzAlignTicks(formal: readonly FfzCell[], informal: readonly FfzCell[], band?: number): AlignedTick[] {
  const imap = new Map<string, readonly number[]>();
  for (const c of informal) {
    const k = ffzKey(c, band);
    if (!imap.has(k)) imap.set(k, c.vec);
  }
  const ticks: AlignedTick[] = [];
  for (const c of formal) {
    const iv = imap.get(ffzKey(c, band));
    if (iv) ticks.push([c.vec, iv]);
  }
  return ticks;
}

/**
 * Read the CORPUS-scale KI: the formal↔informal directed coupling of the two peer sub-sensoria, aligned
 * on a SHARED FFZ address (never ordinal index — two unrelated texts share no ordinal axis; only the
 * rhythmic clock makes them comparable). The SAME runtime as the stratum scale, one grain up — the
 * fractal made literal. The FfzCell streams come from the bands sidecar / worldline clock upstream.
 */
export function readKiCorpus(
  formal: readonly FfzCell[], informal: readonly FfzCell[], opts: CoupleAlignedOptions & { band?: number } = {},
): AlignedCouplingRead {
  return coupleAligned(["formal", "informal"], ffzAlignTicks(formal, informal, opts.band), opts);
}

// ── the LI/KI faces of one text ─────────────────────────────────────────────────────────────────────

/** The LI (理 — pattern) face: the stratification of a source (strata · skeletal tier · associations). */
export function readLi(text: string, sourceCid?: string): Stratification {
  return stratify(text, sourceCid ?? sourceCidOf(text));
}

/** The KI (氣 — flow) face: the stratum-scale red↔black coupling of a source, windowed + screened. */
export function readKi(text: string, opts: CoupleAlignedOptions = {}): AlignedCouplingRead {
  return readKiStratum(text, opts);
}

// ── the compose: the top nameless entity `#has {formal, informal}`, neither top ────────────────────

/** The default bands base-cap for a memetic-wikitext sensorium — the aperture-ladder grain. */
export function defaultSensoriumBands(): SensoriumBands {
  return { grain: "aperture", ladder: FFZ_ADDRESS_ORDER.join(".") };
}

export interface ComposeMemeticWikitextOptions {
  /** the top sensorium's stable graph address. */
  readonly lar: string;
  /** where the FORMAL peer (memes-on-disk) sensorium dir sits (absolute or nested-relative to root). */
  readonly formalDir: string;
  /** where the INFORMAL peer (chat-sessions) sensorium dir sits. */
  readonly informalDir: string;
  /** override the bands base-cap (defaults to the aperture-ladder grain). */
  readonly bands?: SensoriumBands;
  /** override the mint time (tests). */
  readonly created?: string;
}

/**
 * Compose the memetic-wikitext sensorium: a nameless top entity that `#has` NO fiber caps and TWO PEER
 * sub-sensoria as `coupling.children=[formal, informal]` — NEITHER on top. The base-cap coupling plane
 * (read on demand via {@link readKiCorpus}) carries the directed formal↔informal flow. This maps
 * cap-for-cap onto the SHEAF-TRUE sensorium primitive: peers ride the dumb coupling child-edges, the ki
 * rides the base caps, no essence stored at the top.
 */
export function buildMemeticWikitextSensorium(rootDir: string, opts: ComposeMemeticWikitextOptions): SensoriumManifest {
  return buildSensoriumManifest(rootDir, {
    sensorium: "memetic-wikitext",
    lar: opts.lar,
    caps: {},   // the top holds NO byte-storing fiber cap; the peers ARE the corpus, held as coupling children
    bands: opts.bands ?? defaultSensoriumBands(),
    children: [
      { sensorium: "formal", absDir: opts.formalDir },
      { sensorium: "informal", absDir: opts.informalDir },
    ],
    ...(opts.created !== undefined ? { created: opts.created } : {}),
  });
}

/** Build one PEER sub-sensorium (formal or informal) — a thin content-cap sensorium under the corpus. */
export function buildPeerSensorium(
  peerDir: string, peer: "formal" | "informal", lar: string, engine: string, created?: string,
): SensoriumManifest {
  return buildSensoriumManifest(peerDir, {
    sensorium: peer,
    lar,
    caps: { content: { absDir: peerDir, engine } },
    bands: defaultSensoriumBands(),
    ...(created !== undefined ? { created } : {}),
  });
}

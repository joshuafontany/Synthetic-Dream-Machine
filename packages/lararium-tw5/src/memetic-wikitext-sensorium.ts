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
 * THE READER (NO new parser): the meme-ast island scanner (`collectEvents`, disjoint-match) +
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
 * Meme: lar:///ha.ka.ba/lares/api/lares/memetic-wikitext-sensorium
 */

import { collectEvents } from "./meme-ast/index.js";
// mesh SUBPATH imports (the grammar-cache precedent): this module bundles into the plugin blob's
// wiki-sense-fold library, and the mesh ROOT index drags automerge/wasm the VM must never carry.
import { type MeshCoupling } from "@lararium/mesh/mesh-coupling";
import { windowInit, windowPush, windowLengthFor, type WindowConfig, type WindowState } from "@lararium/mesh/windowed-coupling";
import { linearityGate, type LinearityReading } from "@lararium/mesh/linearity-gate";
import { rankTransferEntropy } from "@lararium/mesh/rank-te";
import { ffzMembershipAddress, ffzTruncate, type FfzCells, type FfzBand } from "@lararium/mesh/ffz-project";
import { sha256HexSync } from "@lararium/mesh/crypto";
import { formatDigest } from "@lararium/mesh/agile-digest";
import type { ComparisonStalk, PlaneRestriction } from "@lararium/mesh/sensorium-consistency";

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
  /** the scanner's canonical sigil name (e.g. "ahu", "control-stx", "(generic)") — drives frame detection. */
  readonly sigilName: string;
  /**
   * a FRAMING boundary, not a steering register (`ahu` open/close · the `control-*` phase sigils). A frame
   * stratum BOUNDS blocks; it never spreads a register onto prose. Red steering is DOMAIN-LOCAL between
   * frames (the No-Crossing Constraint) — a steer that would reach past a frame FLOATS + DOCKS instead.
   */
  readonly frame: boolean;
  /** the verbatim island text — the OCP identity key + standoff self-description. */
  readonly raw: string;
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
  /**
   * FLOAT + DOCK — the NCC cure (Coleman & Local). The steer's nearest anchor lies PAST a
   * framing boundary; rather than spread-across (asserting A≺B ∧ A∘B at once — incoherent), the red
   * autosegment FLOATS out of its block and RE-DOCKS at the next block's boundary anchor. A licensed
   * hand-off, never a spread. `false` = an ordinary domain-local spread.
   */
  readonly floatDock: boolean;
  /**
   * DEFAULT-FILL — the WFC repair (Goldsmith Proposal 4 / Harmonic Phonology). This edge was ADDED to
   * satisfy the Well-Formedness Condition: an unmarked prose anchor default-fills the ambient register by
   * spreading the nearest in-domain steer onto it (never a rejection). `false` = a primary read edge.
   */
  readonly defaultFill: boolean;
}

/** The full stratification of one memetic-wikitext source — the LI (pattern) face of the reader. */
export interface Stratification {
  readonly sourceCid: string;
  readonly skeletal: readonly SkeletalAnchor[];
  readonly strata: readonly Stratum[];
  readonly associations: readonly AssociationEdge[];
}

/** Content-address a source (sha-256, hex) — the pin every standoff stratum carries. The hash rides
 *  TextEncoder; a sandbox without one (the TW5 VM) gets a NAMED refusal, never a bare ReferenceError. */
export function sourceCidOf(text: string): string {
  if (typeof TextEncoder === "undefined") {
    throw new Error(
      "[memetic-wikitext-sensorium] the VM sandbox carries no TextEncoder — pass an explicit sourceCid to stratify()",
    );
  }
  // Canonical algorithm-tagged form (`sha256:<hex>`, agile-digest). The reader side
  // (`parseDigest`/`digestsEqual`) also accepts the `sha256-<hex>` SRI dash
  // form, so a stored dash-tagged pin keeps comparing equal.
  return formatDigest("sha256", sha256HexSync(text));
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

/** One red island — a scanned `<<~…>>` range with its scanner-canonical name (drives frame detection). */
interface Island { start: number; end: number; raw: string; sigilName: string; }

/** Merge event spans into DISJOINT red islands (position-dedup can still leave overlaps; we normalize). */
function disjointIslands(spans: Island[]): Island[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Island[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) {
      // overlap — extend the island, keep the widest raw + name (the outer construct steers/bounds)
      if (s.end > last.end) { last.end = s.end; last.raw = s.raw; last.sigilName = s.sigilName; }
      continue;
    }
    out.push({ ...s });
  }
  return out;
}

/**
 * A FRAMING boundary — a structural block delimiter, never a steering register. The `ahu` scope sockets
 * (open/close) and the `control-*` phase sigils (SOH/STX/ETX/EOT) bound blocks; the red steering register
 * is DOMAIN-LOCAL between them (the No-Crossing Constraint). Everything else is a steer (red/base).
 */
export function isFrameSigil(sigilName: string): boolean {
  return sigilName === "ahu" || sigilName.startsWith("control-");
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
  const islands = disjointIslands(events.map((e) => ({ start: e.pos, end: e.end, raw: e.raw, sigilName: e.sigilName })));

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
    const frame = isFrameSigil(isl.sigilName);
    strata.push({
      span: [isl.start, isl.end],
      channel: muOp ? "base" : "red",
      ...(muOp ? { muOp } : {}),
      head: sigilHead(isl.raw),
      sigilName: isl.sigilName,
      frame,
      raw: isl.raw,
      band: bandForSpanLength(len),
      sourceCid,
    });
    cursor = isl.end;
  }
  pushAnchor(cursor, text.length);

  // Autosegmental association (typed, unit-anchored): a control sigil SEEDS FORWARD, so each stratum
  // spreads RIGHTWARD onto the prose it governs — the nearest anchor starting on/after the stratum's end.
  // Where none exists (a trailing/closing sigil), it docks LEFTWARD onto the nearest preceding anchor.
  //
  // FRAME strata never steer — they BOUND (no association). And a rightward reach that would cross a
  // framing boundary is the NCC breach (Coleman & Local): rather than spread-across, the autosegment
  // FLOATS + DOCKS at the next block's boundary anchor (a licensed hand-off), marked `floatDock`.
  const associations: AssociationEdge[] = [];
  for (let si = 0; si < strata.length; si++) {
    const s = strata[si]!;
    if (s.frame) continue;   // framing boundaries bound blocks; they do not spread a register
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
    // NCC: does a framing boundary lie STRICTLY between this steer and its rightward anchor? Then the
    // reach is not a spread — it is a FLOAT + DOCK across the boundary (a licensed hand-off).
    const floatDock = direction === "rightward" && strata.some(
      (b) => b.frame && b.span[0] >= s.span[1] && b.span[0] < anchor.span[0],
    );
    associations.push({
      stratum: si, anchor: anchorIdx, relation: s.head, direction,
      crossBand: s.band !== anchor.band, floatDock, defaultFill: false,
    });
  }

  return { sourceCid, skeletal, strata, associations };
}

/** Does a framing boundary sit STRICTLY inside the byte range [lo, hi)? (NCC domain-locality test.) */
function frameBetween(strata: readonly Stratum[], lo: number, hi: number): boolean {
  return strata.some((b) => b.frame && b.span[0] >= lo && b.span[0] < hi);
}

/**
 * WFC MINIMAL-REPAIR — never reject an under-associated parse; REPAIR it (Goldsmith Proposal 4 /
 * Harmonic Phonology; the graceful-parsing doctrine — augment, don't break). Each prose anchor left
 * unmarked by {@link stratify} (no steer reached it) DEFAULT-FILLS the ambient register: the nearest
 * IN-DOMAIN steer spreads onto it (preferring the register already in force to the left — Goldsmith's
 * Association Convention — else spreading leftward from the following steer). A frame boundary blocks the
 * spread (NCC domain-locality). An anchor with no steer in either domain stays well-formed as pure black
 * default (the ambient IS black; no float). Added edges carry `defaultFill: true`.
 */
export function repairWellFormedness(strat: Stratification): Stratification {
  const marked = new Set<number>(strat.associations.map((a) => a.anchor));
  const added: AssociationEdge[] = [];
  for (let ai = 0; ai < strat.skeletal.length; ai++) {
    if (marked.has(ai)) continue;
    const anchor = strat.skeletal[ai]!;
    // in-force register (left): nearest preceding steer, no frame boundary between it and the anchor
    let sIdx = -1;
    let direction: SpreadDirection = "rightward";
    for (let si = strat.strata.length - 1; si >= 0; si--) {
      const s = strat.strata[si]!;
      if (s.frame || s.span[1] > anchor.span[0]) continue;
      if (!frameBetween(strat.strata, s.span[1], anchor.span[0])) { sIdx = si; break; }
    }
    // fallback (right): nearest following steer spreads leftward, no frame boundary between
    if (sIdx === -1) {
      direction = "leftward";
      for (let si = 0; si < strat.strata.length; si++) {
        const s = strat.strata[si]!;
        if (s.frame || s.span[0] < anchor.span[1]) continue;
        if (!frameBetween(strat.strata, anchor.span[1], s.span[0])) { sIdx = si; break; }
      }
    }
    if (sIdx === -1) continue;   // no in-domain steer — pure black default, well-formed, no float
    const s = strat.strata[sIdx]!;
    added.push({
      stratum: sIdx, anchor: ai, relation: s.head, direction,
      crossBand: s.band !== anchor.band, floatDock: false, defaultFill: true,
    });
  }
  return { ...strat, associations: [...strat.associations, ...added] };
}

/** The verdict of the B&E finite-state validity check — well-formed ⟺ non-empty tier intersection. */
export interface TierIntersection {
  /** well-formed ⟺ the synchronized product of the per-tier automata is NON-EMPTY. */
  readonly valid: boolean;
  /** why the intersection is empty (the tier that could not synchronize), when `valid === false`. */
  readonly reason?: string;
}

/**
 * B&E FST-INTERSECTION VALIDITY (Bird & Ellison 1994) — the stratified parse is the synchronized
 * INTERSECTION product of the per-tier automata, and it is well-formed IFF that intersection is
 * NON-EMPTY. A decidable finite-state check over the tiers:
 *
 *  1. the SKELETAL tier automaton accepts a strictly-ordered, non-overlapping anchor sequence;
 *  2. the STRATA tier automaton accepts a strictly-ordered, non-overlapping stratum sequence;
 *  3. the ASSOCIATION product synchronizes them PLANARLY — two association lines may not cross (the
 *     No-Crossing Constraint). Ranks are the span-ordered indices, so lines i,j cross IFF
 *     `sign(sᵢ−sⱼ)·sign(aᵢ−aⱼ) < 0` — an inversion of the stratum order against the anchor order.
 *
 * Any tier that rejects ⇒ the product is empty ⇒ ill-formed. A parse from {@link stratify} synchronizes
 * (planar by construction); a hand-crossed association graph does not (the honest rejection).
 */
export function intersectTiers(strat: Stratification): TierIntersection {
  for (let i = 1; i < strat.skeletal.length; i++) {
    if (strat.skeletal[i]!.span[0] < strat.skeletal[i - 1]!.span[1]) {
      return { valid: false, reason: "skeletal tier automaton rejects — overlapping/mis-ordered anchors" };
    }
  }
  for (let i = 1; i < strat.strata.length; i++) {
    if (strat.strata[i]!.span[0] < strat.strata[i - 1]!.span[1]) {
      return { valid: false, reason: "strata tier automaton rejects — overlapping/mis-ordered strata" };
    }
  }
  const e = strat.associations;
  for (let i = 0; i < e.length; i++) {
    for (let j = i + 1; j < e.length; j++) {
      const ds = Math.sign(e[i]!.stratum - e[j]!.stratum);
      const da = Math.sign(e[i]!.anchor - e[j]!.anchor);
      if (ds * da < 0) {
        return { valid: false, reason: "association product empty — crossing lines (No-Crossing Constraint)" };
      }
    }
  }
  return { valid: true };
}

/**
 * OCP NORMALIZATION (the Obligatory Contour Principle) — two ADJACENT IDENTICAL red autosegments on the
 * strata tier collapse to one (e.g. two identical `<<~ confidence Synthesis 12/20 >>` in a row). Adjacent =
 * consecutive strata with NO prose anchor between them (whitespace only); identical = same channel, same
 * Mu operator, same normalized sigil text. Frames never collapse (they bound, not steer). The merged
 * stratum spans both, its band re-derives from the merged length, and associations re-point (deduped) —
 * free canonicalization, no information lost that the contour did not already duplicate.
 */
export function normalizeOcp(strat: Stratification): Stratification {
  const norm = (r: string): string => r.replace(/\s+/g, " ").trim();
  const anchorBetween = (lo: number, hi: number): boolean =>
    lo < hi && strat.skeletal.some((a) => a.span[0] >= lo && a.span[0] < hi);

  const out: Array<{ s: Stratum; span: [number, number] }> = [];
  const remap: number[] = new Array(strat.strata.length).fill(-1);
  for (let i = 0; i < strat.strata.length; i++) {
    const cur = strat.strata[i]!;
    const last = out[out.length - 1];
    const identical =
      !!last && !last.s.frame && !cur.frame &&
      last.s.channel === cur.channel && last.s.muOp === cur.muOp &&
      norm(last.s.raw) === norm(cur.raw);
    if (last && identical && !anchorBetween(last.span[1], cur.span[0])) {
      last.span = [last.span[0], Math.max(last.span[1], cur.span[1])];   // collapse the contour
      remap[i] = out.length - 1;
      continue;
    }
    remap[i] = out.length;
    out.push({ s: cur, span: [cur.span[0], cur.span[1]] });
  }

  const strata: Stratum[] = out.map((o) => ({
    ...o.s, span: [o.span[0], o.span[1]] as Span, band: bandForSpanLength(o.span[1] - o.span[0]),
  }));

  const seen = new Set<string>();
  const associations: AssociationEdge[] = [];
  for (const a of strat.associations) {
    const ns = remap[a.stratum]!;
    if (ns < 0) continue;
    const key = `${ns}:${a.anchor}:${a.relation}:${a.direction}:${a.defaultFill}`;
    if (seen.has(key)) continue;
    seen.add(key);
    associations.push({ ...a, stratum: ns });
  }
  return { sourceCid: strat.sourceCid, skeletal: strat.skeletal, strata, associations };
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
  /** the screen's verdict: the Gaussian read leaves nonlinear signal on the table → escalate to rank-TE. */
  readonly escalate: boolean;
  /** the escalation ACTED: order-robust rank-TE (bits, both directions) on the strongest-nonlinear dim,
   * or null when the screen stayed linear. This is the read the Gaussian coupling under-reads — the gate
   * no longer just flags nonlinearity, it answers it. */
  readonly rankTE: RankEscalation | null;
}

/** The escalation's answer — directed symbolic (rank) transfer entropy where the Gaussian read fell short. */
export interface RankEscalation {
  /** rank-TE (bits) child-0 → child-1 on the representative dim (the steering red drives the black). */
  readonly forward: number;
  /** rank-TE (bits) child-1 → child-0. */
  readonly backward: number;
  /** the shared dim the escalation read — the max-dCorGap representative. */
  readonly dim: number;
  /** usable symbol transitions the estimate stood on. */
  readonly samples: number;
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
  // d_joint = the JOINT dimension the estimator floor (windowLengthFor) rides on. Deriving it from
  // ticks[0] ALONE lets a RAGGED first tick (lower-dimensional than the rest — a malformed sidecar) under-
  // count the floor: L collapses below windowLengthFor(true d_joint), warming is DEFEATED, and the SAME data
  // the uniform path honestly refuses (warming) instead FABRICATES a coupling edge — the anti-false-sovereign
  // failure this module exists to forbid. Take the MAX joint dimension any tick carries (never under-count),
  // floored at the child count, so a thin/ragged tick can only RAISE the floor, never lower it.
  let dJoint = Math.max(1, children.length);
  for (const tick of ticks) {
    let d = 0;
    for (const v of tick) d += v.length;
    if (d > dJoint) dJoint = d;
  }
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

  // Tier-0 screen on the PRIMARY coupling channel — child-0 (the steering red / the formal register)
  // against child-1, ACROSS EVERY SHARED DIM, never dim-0 alone: a nonlinearity the Gaussian read would
  // miss can hide in ANY coordinate, so a dim-0-only screen leaves signal on the table. Run the gate per
  // shared dim; escalate if ANY dim escalates; report the dim carrying the STRONGEST nonlinear-beyond-
  // linear signal (max dCorGap) as the representative reading. Never trust the Gaussian read past this.
  let linearity: LinearityReading | null = null;
  let repX: number[] = [], repY: number[] = [], repDim = 0;   // the representative dim's streams, kept for the escalation
  if (children.length >= 2 && ticks.length >= 8) {
    let d0 = 0, d1 = 0;
    for (const t of ticks) { d0 = Math.max(d0, t[0]?.length ?? 0); d1 = Math.max(d1, t[1]?.length ?? 0); }
    const dims = Math.max(1, Math.min(d0, d1));   // at least dim-0 (a scalar channel keeps dim-0 behavior)
    let anyEscalate = false;
    for (let d = 0; d < dims; d++) {
      const x = ticks.map((t) => t[0]?.[d] ?? 0);
      const y = ticks.map((t) => t[1]?.[d] ?? 0);
      const r = linearityGate(x, y, opts.linearity ?? {});
      anyEscalate = anyEscalate || r.escalate;
      // keep the strongest nonlinear-beyond-linear reading (max dCorGap) as the representative one,
      // and its streams — the escalation reads the dim that most escapes the Gaussian.
      if (linearity === null || r.dCorGap > linearity.dCorGap) { linearity = r; repX = x; repY = y; repDim = d; }
    }
    // the representative reading carries the OR-of-dims escalate verdict, not just its own dim's.
    if (linearity !== null && anyEscalate !== linearity.escalate) linearity = { ...linearity, escalate: anyEscalate };
  }

  // ACT on the verdict — the gate no longer just flags nonlinearity, it answers it. When the screen
  // escalates, read the order-robust rank-TE (both directions) on the representative dim: symbolic TE
  // reads ORDER not magnitude, so it recovers the monotone-nonlinear / heavy-tailed coupling the Gaussian
  // read leaves on the table. Skipped on a linear screen (no cost when the Gaussian default suffices).
  let rankTE: RankEscalation | null = null;
  if (linearity?.escalate && repX.length >= 8) {
    const fwd = rankTransferEntropy(repX, repY);
    const bwd = rankTransferEntropy(repY, repX);
    rankTE = { forward: fwd.te, backward: bwd.te, dim: repDim, samples: fwd.samples };
  }

  return { coupling, warming, filled, resets, ticks: ticks.length, linearity, escalate: linearity?.escalate ?? false, rankTE };
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
 * fractal made literal. The FfzCell streams come from the bands holder / worldline clock upstream.
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
// ── an ENGINEERED overlap over a real skeletal tier (consistency caution a, made concrete) ─────────

/**
 * Build the three sheaf-plane restrictions from a REAL {@link Stratification} — the engineered
 * shared-comparison-stalk (the consistency organ's caution a; the organ itself lives platform-blind in
 * `@lararium/mesh`, this adapter stays beside the corpus reader that produces its input). The stalk
 * carries the skeletal tier: each anchor `s{i}` names a shared unit ALL THREE planes speak to (genuine
 * redundancy, not disjoint aspects). Each plane gives every anchor a [0,1] salience through its OWN
 * lens, so a coherent text has the three coincide (they glue), and a unit that reads content-heavy yet
 * structurally trivial and pattern-absent makes them DIVERGE:
 *
 *   content   — normalized PROSE MASS (the recurring-coherence carrier: how much black prose the anchor holds).
 *   structure — normalized ASSOCIATION DEGREE (the AST grain: how many red strata dock onto the anchor).
 *   form      — RECURRING-RELATION participation (the induced grammar: 1 iff a relation label occurring
 *               ≥2× across the associations governs the anchor, else 0).
 *
 * Returns `{ stalk, restrictions }` ready for `consistencyRadius`. On a well-formed corpus the three
 * agree on the salient units and the radius sits ~0; seed a disagreement (an ungoverned prose anchor)
 * and it goes positive, localized to that anchor.
 */
export function stratificationRestrictions(strat: Stratification): {
  stalk: ComparisonStalk; restrictions: PlaneRestriction[];
} {
  const units = strat.skeletal.map((_, i) => `s${i}`);

  // structure: association degree per anchor.
  const degree = new Array<number>(strat.skeletal.length).fill(0);
  // form: which relation labels recur (≥2 occurrences), and which anchors they govern.
  const relCount = new Map<string, number>();
  for (const e of strat.associations) relCount.set(e.relation, (relCount.get(e.relation) ?? 0) + 1);
  for (const e of strat.associations) degree[e.anchor] = (degree[e.anchor] ?? 0) + 1;

  const maxLen = Math.max(1, ...strat.skeletal.map((a) => a.span[1] - a.span[0]));
  const maxDeg = Math.max(1, ...degree);

  const content = new Map<string, number>();
  const structure = new Map<string, number>();
  const form = new Map<string, number>();
  for (let i = 0; i < strat.skeletal.length; i++) {
    const a = strat.skeletal[i]!;
    content.set(units[i]!, (a.span[1] - a.span[0]) / maxLen);
    structure.set(units[i]!, (degree[i] ?? 0) / maxDeg);
  }
  for (let i = 0; i < strat.skeletal.length; i++) form.set(units[i]!, 0);
  for (const e of strat.associations) {
    if ((relCount.get(e.relation) ?? 0) >= 2) form.set(units[e.anchor]!, 1);
  }

  return {
    stalk: { units },
    restrictions: [
      { plane: "content", variance: "sheaf", value: content },
      { plane: "structure", variance: "sheaf", value: structure },
      { plane: "form", variance: "sheaf", value: form },
    ],
  };
}

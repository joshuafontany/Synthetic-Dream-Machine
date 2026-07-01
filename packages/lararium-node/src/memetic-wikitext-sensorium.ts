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
import { coupleMesh, type ChildSignalMV, type MeshCoupling } from "@lararium/mesh";
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

// ── the KI: windowed signals + the shared coupler (the fractal atom) ────────────────────────────────

/** Per-window channel densities of one text (the atom both scales window through). */
interface WindowDensity {
  readonly redFrac: number;
  readonly blackFrac: number;
}

/** Window a text's stratification into `windowCount` byte-windows; per window, the red/black density. */
export function windowDensities(text: string, windowCount: number, strat: Stratification = stratify(text)): WindowDensity[] {
  const len = text.length;
  const wlen = Math.max(1, Math.ceil(len / windowCount));
  const out: WindowDensity[] = [];
  for (let w = 0; w < windowCount; w++) {
    const ws = w * wlen;
    const we = Math.min(len, ws + wlen);
    const width = Math.max(1, we - ws);
    let redChars = 0;
    for (const s of strat.strata) {
      const os = Math.max(ws, s.span[0]);
      const oe = Math.min(we, s.span[1]);
      if (oe > os) redChars += oe - os;
    }
    const redFrac = redChars / width;
    out.push({ redFrac, blackFrac: 1 - redFrac });
  }
  return out;
}

/**
 * The SHARED COUPLER (the fractal atom): hand a set of named `ChildSignalMV` streams to the mesh keel's
 * `coupleMesh` (whiten → couple → χ²-gate). NEVER re-derives the coupling; a thin call. Both scales route
 * through here — {@link readKiStratum} (red↔black) and {@link readKiCorpus} (formal↔informal).
 */
export function coupleStreams(streams: readonly ChildSignalMV[], opts?: Parameters<typeof coupleMesh>[1]): MeshCoupling {
  return coupleMesh(streams, opts);
}

/**
 * STRATUM-scale KI: split ONE text into its red and black channels, window each, and couple them —
 * reading the directed red↔black flow (does the classifier register lead the prose, or trail it?).
 */
export function channelSignals(text: string, windowCount = 48): readonly ChildSignalMV[] {
  const dens = windowDensities(text, windowCount);
  const red: ChildSignalMV = { name: "red", signal: dens.map((d) => [d.redFrac]) };
  const black: ChildSignalMV = { name: "black", signal: dens.map((d) => [d.blackFrac]) };
  return [red, black];
}

/** Read the stratum-scale KI: the red↔black directed coupling of one memetic-wikitext text. */
export function readKiStratum(text: string, windowCount = 48, opts?: Parameters<typeof coupleMesh>[1]): MeshCoupling {
  return coupleStreams(channelSignals(text, windowCount), opts);
}

/**
 * CORPUS-scale KI: window the FORMAL and INFORMAL texts (each on the SAME window grid) into density
 * vectors and couple them — the peer sub-sensoria's directed formal↔informal flow. The SAME windowing
 * atom and the SAME coupler as the stratum scale (the fractal made literal). The shared ordinal-window
 * grid is the first-instance alignment; the FFZ aperture clock is the named, not-yet-built binding.
 */
export function corpusSignals(formalText: string, informalText: string, windowCount = 48): readonly ChildSignalMV[] {
  const f = windowDensities(formalText, windowCount);
  const i = windowDensities(informalText, windowCount);
  const formal: ChildSignalMV = { name: "formal", signal: f.map((d) => [d.redFrac, d.blackFrac]) };
  const informal: ChildSignalMV = { name: "informal", signal: i.map((d) => [d.redFrac, d.blackFrac]) };
  return [formal, informal];
}

/** Read the corpus-scale KI: the formal↔informal directed coupling of the two peer sub-sensoria. */
export function readKiCorpus(formalText: string, informalText: string, windowCount = 48, opts?: Parameters<typeof coupleMesh>[1]): MeshCoupling {
  return coupleStreams(corpusSignals(formalText, informalText, windowCount), opts);
}

// ── the LI/KI faces of one text ─────────────────────────────────────────────────────────────────────

/** The LI (理 — pattern) face: the stratification of a source (strata · skeletal tier · associations). */
export function readLi(text: string, sourceCid?: string): Stratification {
  return stratify(text, sourceCid ?? sourceCidOf(text));
}

/** The KI (氣 — flow) face: the stratum-scale red↔black coupling of a source. */
export function readKi(text: string, windowCount = 48, opts?: Parameters<typeof coupleMesh>[1]): MeshCoupling {
  return readKiStratum(text, windowCount, opts);
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

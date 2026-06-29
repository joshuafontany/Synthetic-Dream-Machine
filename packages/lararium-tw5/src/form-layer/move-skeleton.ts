/**
 * move-skeleton — P1 of the living-grammar form-layer (the move-skeleton emitter).
 * Meme: lar:///ha.ka.ba/@lararium/api/living-grammar-palace#two-planes
 *
 * Route A — abstract-then-encode: the CNL emits its own form-markers (the
 * classifier channel, the `<<~ … >>` sigils that steer). turn-harvest already
 * reads those markers off a verbatim turn; this emitter folds a TurnHarvest
 * result + a content-placeholdered meme-ast tree into the two shapes the
 * form-vector encoder (P2, the Python sidecar) consumes:
 *
 *  (a) the LINEAR move-skeleton STREAM — the ordered sequence of move tokens
 *      (sigil-family · Voice · phase · ward-state) with all prose content
 *      stripped to `_` placeholders. NO parser is needed: the markers are
 *      already harvested.
 *  (b) the PLACEHOLDERED GRAPH — the meme-ast tree with every leaf content
 *      blanked to `_`, keeping kind · sigilName · attrs-KEYS · recoveredAs ·
 *      confidence — the structure without the words.
 *
 * Both are PURE: the harvest + tree go in, the skeleton comes out. No store, no
 * ChromaDB, no Python, no network. The form-vector encoder (P2) plugs in
 * downstream — it reads {@link MoveSkeleton}, indexes its tokens against the
 * {@link ConstructiconBasis} (P0), and emits the fuzzy-membership vector.
 */

import type {
  TurnHarvest,
  VoiceSignal,
  WardSignal,
  HudSignal,
  ConfidenceSignal,
  StanceSignal,
  OffsetSignal,
  OtherSigil,
} from "@lararium/mesh";
import type { MemeAstNode, MemeAstKind } from "../meme-ast/types.js";
import {
  OODA_HA_PHASES,
  phaseForGlyph,
  resolveVoiceRole,
  wardStateForGlyph,
} from "./constructicon-basis.js";

// ---------------------------------------------------------------------------
// The linear move-skeleton stream
// ---------------------------------------------------------------------------

/** The dimension a move token names. `content` is the stripped-prose `_`. */
export type MoveTokenKind =
  | "bearing" // the lares aim/yield frame
  | "voice"
  | "phase"
  | "ward"
  | "hud"
  | "confidence"
  | "syad"
  | "oracle"
  | "sigil" // a recognized but non-specialized sigil (kahea, mu, …)
  | "water" // an unrecognized `<<~` opener (panic-synced)
  | "content"; // stripped prose placeholder (`_`)

/** One token in the linear move-skeleton stream. */
export interface MoveToken {
  readonly kind: MoveTokenKind;
  /** Canonical token value (resolved axis label, or `_` for content). */
  readonly token: string;
  /** The constructicon basis axis id this maps to, or null when novel / no axis. */
  readonly axisId: string | null;
  /** Character offset in the turn (synthetic for the frame: aim < 0, yield large). */
  readonly offset: number;
}

const CONTENT_PLACEHOLDER = "_";

// ---------------------------------------------------------------------------
// The placeholdered graph
// ---------------------------------------------------------------------------

/**
 * A meme-ast node with its leaf content blanked. Structure (kind · sigilName ·
 * family · slot · phase · attrs-KEYS · recoveredAs · confidence) survives; every
 * word becomes `_`. The graph keeps the SHAPE the turn enacted, never the prose.
 */
export interface PlaceholderNode {
  readonly kind: MemeAstKind;
  /** Sigil / dynamic name, when the node carries one. */
  readonly sigilName?: string;
  /** PranalaSugar sigil keyword (loulou / aka / …). */
  readonly sigil?: string;
  /** Edge family, when present. */
  readonly family?: string;
  /** Pae phase (soh/stx/etx/eot). */
  readonly phase?: string;
  /** Ahu slot path. */
  readonly slot?: string;
  /** Attribute KEYS only — values blanked. Sorted for stability. */
  readonly attrKeys?: readonly string[];
  /** The resilient-recovery rung, when the node was recovered. */
  readonly recoveredAs?: string;
  /** The 0..20 manifestation confidence, when graded. */
  readonly confidence?: number;
  /** Every leaf content blanked to `_`. */
  readonly content: typeof CONTENT_PLACEHOLDER;
  readonly children: readonly PlaceholderNode[];
}

// ---------------------------------------------------------------------------
// MoveSkeleton — the emitter's output
// ---------------------------------------------------------------------------

export interface MoveSkeletonCounts {
  readonly tokens: number;
  readonly content: number;
  readonly water: number;
  readonly voices: number;
  readonly wards: number;
  readonly phases: number;
  readonly sigils: number;
}

/** The fold of a TurnHarvest + meme-ast tree — both shapes the encoder consumes. */
export interface MoveSkeleton {
  /** (a) The linear move-skeleton stream (prose stripped to `_`). */
  readonly stream: readonly MoveToken[];
  /** (b) The placeholdered meme-ast graph (leaf content blanked). */
  readonly graph: readonly PlaceholderNode[];
  /** Quick conformance read over the stream. */
  readonly counts: MoveSkeletonCounts;
  /** The harvest band carried through (provenance for the encoder). */
  readonly band: TurnHarvest["band"];
}

// ---------------------------------------------------------------------------
// (a) the linear stream
// ---------------------------------------------------------------------------

/** A positioned signal lifted into one-or-more move tokens, keyed by offset. */
interface Positioned {
  readonly offset: number;
  /** End of the signal's span (offset + raw.length) — for content-gap detection. */
  readonly end: number;
  readonly tokens: MoveToken[];
}

function spanEnd(sig: OffsetSignal): number {
  return sig.offset + (sig.raw?.length ?? 0);
}

function voiceTokens(v: VoiceSignal): MoveToken[] {
  const role = resolveVoiceRole(v.name, v.role);
  return [
    {
      kind: "voice",
      token: role ?? v.name.toLowerCase(),
      axisId: role ? `voice:${role}` : null,
      offset: v.offset,
    },
  ];
}

function wardTokens(w: WardSignal): MoveToken[] {
  const state = wardStateForGlyph(w.tool);
  return [
    {
      kind: "ward",
      token: state ?? (w.tool ?? "ward"),
      axisId: state ? `ward:${state}` : null,
      offset: w.offset,
    },
  ];
}

/** A HUD signal: one `hud` token, plus a phase token per OODA-HA glyph in its payload. */
function hudTokens(h: HudSignal): MoveToken[] {
  const out: MoveToken[] = [
    { kind: "hud", token: "hud", axisId: "sigil:hud", offset: h.offset },
  ];
  const payload = h.oodaHa ?? "";
  for (const phase of OODA_HA_PHASES) {
    if (payload.includes(phase.glyph)) {
      const name = phaseForGlyph(phase.glyph);
      out.push({
        kind: "phase",
        token: name ?? phase.name,
        axisId: `phase:${phase.name}`,
        offset: h.offset,
      });
    }
  }
  return out;
}

function confidenceTokens(c: ConfidenceSignal): MoveToken[] {
  return [{ kind: "confidence", token: "confidence", axisId: "sigil:confidence", offset: c.offset }];
}

function syadTokens(s: StanceSignal): MoveToken[] {
  return [{ kind: "syad", token: "syad", axisId: "sigil:syad", offset: s.offset }];
}

function oracleTokens(o: OffsetSignal): MoveToken[] {
  return [{ kind: "oracle", token: "oracle", axisId: "sigil:oracle", offset: o.offset }];
}

function otherTokens(o: OtherSigil): MoveToken[] {
  return [{ kind: "sigil", token: o.kind, axisId: `sigil:${o.kind}`, offset: o.offset }];
}

/**
 * Build the linear stream. Positioned signals (those carrying an offset) sort by
 * offset; a `_` content token marks each prose gap between them. The bearing
 * frame carries no offset in the harvest — its aim token PREPENDS and its yield
 * token APPENDS (the chiasmus), and water tokens (count-only) trail at the end.
 */
function buildStream(h: TurnHarvest): MoveToken[] {
  const positioned: Positioned[] = [];
  const add = (sig: OffsetSignal, toks: MoveToken[]): void => {
    positioned.push({ offset: sig.offset, end: spanEnd(sig), tokens: toks });
  };

  for (const v of h.voices) add(v, voiceTokens(v));
  for (const w of h.wards) add(w, wardTokens(w));
  for (const hud of h.huds) add(hud, hudTokens(hud));
  for (const c of h.confidences) add(c, confidenceTokens(c));
  for (const s of h.stances) add(s, syadTokens(s));
  for (const o of h.oracles) add(o, oracleTokens(o));
  for (const o of h.others) add(o, otherTokens(o));

  positioned.sort((a, b) => a.offset - b.offset || a.end - b.end);

  const stream: MoveToken[] = [];

  // The aim leg opens the chiasmus.
  if (h.bearing?.aimUri != null) {
    stream.push({ kind: "bearing", token: "aim", axisId: "sigil:lares", offset: -1 });
  }

  // Interleave positioned tokens with `_` content placeholders for prose gaps.
  let cursor = 0;
  for (const p of positioned) {
    if (p.offset > cursor) {
      stream.push({
        kind: "content",
        token: CONTENT_PLACEHOLDER,
        axisId: null,
        offset: cursor,
      });
    }
    stream.push(...p.tokens);
    if (p.end > cursor) cursor = p.end;
  }

  // The yield leg closes the chiasmus.
  if (h.bearing?.yieldUri != null) {
    stream.push({
      kind: "bearing",
      token: "yield",
      axisId: "sigil:lares",
      offset: Number.MAX_SAFE_INTEGER,
    });
  }

  // Water: unrecognized openers, count-only in the harvest — trail at the end.
  for (let i = 0; i < h.waterCount; i++) {
    stream.push({ kind: "water", token: "~water", axisId: null, offset: Number.MAX_SAFE_INTEGER });
  }

  return stream;
}

// ---------------------------------------------------------------------------
// (b) the placeholdered graph
// ---------------------------------------------------------------------------

type WithBody = { body?: readonly MemeAstNode[] };

/** Blank one meme-ast node: keep the shape, strip the words. */
function placeholderNode(node: MemeAstNode): PlaceholderNode {
  const out: {
    -readonly [K in keyof PlaceholderNode]: PlaceholderNode[K];
  } = {
    kind: node.kind,
    content: CONTENT_PLACEHOLDER,
    children: placeholderTree((node as WithBody).body ?? []),
  };

  // Structural facets — kept; never the content.
  const anyNode = node as unknown as Record<string, unknown>;
  if (typeof anyNode["sigilName"] === "string") out.sigilName = anyNode["sigilName"] as string;
  if (typeof anyNode["sigil"] === "string") out.sigil = anyNode["sigil"] as string;
  if (typeof anyNode["family"] === "string") out.family = anyNode["family"] as string;
  if (typeof anyNode["phase"] === "string") out.phase = anyNode["phase"] as string;
  if (typeof anyNode["slot"] === "string") out.slot = anyNode["slot"] as string;

  // attrs → KEYS only (sorted, stable); values blanked by omission.
  const attrs = anyNode["attrs"];
  if (attrs && typeof attrs === "object") {
    out.attrKeys = Object.keys(attrs as Record<string, unknown>).sort();
  }

  // The resilient-recovery gradient — kept (graceful-parsing).
  if (typeof node.recoveredAs === "string") out.recoveredAs = node.recoveredAs;
  if (typeof node.confidence === "number") out.confidence = node.confidence;

  return out;
}

/** Blank a meme-ast forest: every leaf content → `_`, structure preserved. */
export function placeholderTree(nodes: readonly MemeAstNode[]): PlaceholderNode[] {
  return nodes.map(placeholderNode);
}

// ---------------------------------------------------------------------------
// emitMoveSkeleton — the P1 fold
// ---------------------------------------------------------------------------

/**
 * Fold a TurnHarvest + a meme-ast tree into the move-skeleton. The harvest
 * drives the linear stream (Route A — markers already emitted); the tree drives
 * the placeholdered graph. Pure: no I/O, no store.
 *
 * @param harvest  the turn-harvest result ({@link harvestTurnGradient}).
 * @param tree     the parsed meme-ast forest ({@link parseMemeNodes}); pass `[]`
 *                 when no tree is available (the stream still emits).
 */
export function emitMoveSkeleton(
  harvest: TurnHarvest,
  tree: readonly MemeAstNode[] = [],
): MoveSkeleton {
  const stream = buildStream(harvest);
  const graph = placeholderTree(tree);

  const counts: MoveSkeletonCounts = {
    tokens: stream.length,
    content: stream.filter((t) => t.kind === "content").length,
    water: stream.filter((t) => t.kind === "water").length,
    voices: stream.filter((t) => t.kind === "voice").length,
    wards: stream.filter((t) => t.kind === "ward").length,
    phases: stream.filter((t) => t.kind === "phase").length,
    sigils: stream.filter(
      (t) =>
        t.kind === "sigil" ||
        t.kind === "hud" ||
        t.kind === "confidence" ||
        t.kind === "syad" ||
        t.kind === "oracle" ||
        t.kind === "bearing",
    ).length,
  };

  return { stream, graph, counts, band: harvest.band };
}

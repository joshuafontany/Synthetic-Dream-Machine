/**
 * carrier-check — the block check a carrier carries, computed rather than stored.
 *
 * ── WHY IT DERIVES AND NEVER SITS IN A FIELD ────────────────────────────────────────────────────
 * A check held as a record field is a stored derivation, and a stored derivation goes stale the moment
 * the thing it derives from moves. This tree has met that five times over: a genesis manifest naming a
 * plugin two edits back, a router arm matching a shape no carrier writes, a harvester scanning for a
 * sigil that stopped rendering. Each one stayed internally consistent and described something that had
 * stopped being true, and nothing could notice because nothing recomputed.
 *
 * So the emitter computes the check over the body it has just assembled, and a reader recomputes it
 * over the bytes in front of it. Two computations of one fact, never a copy of one.
 *
 * ── THE SPAN, PER THE RECEIVED FRAMING ──────────────────────────────────────────────────────────
 * A block runs `STX -> text -> ETX -> BCC`: the terminator comes first and the check follows it
 * directly (IBM BSC, 1967). The span runs from the first character of the STX sigil to the last
 * character of the ETX sigil, inclusive — so the check covers the marks that bound it and never covers
 * itself, which is what lets it sit after ETX with no self-exclusion rule.
 *
 * ── TWO ALTITUDES: HEX TRAVELS, GLYPHS RENDER ───────────────────────────────────────────────────
 * The slot the check occupies — after ETX, before EOT — carries it in the received framing and in this
 * grammar alike, so one form serves both and the check needs no wrapper of its own.
 *
 * What the check LOOKS like splits by artifact class rather than by layer.
 *
 * A CARRIER holds the hex form, `<namespace>:<16 hex>`, because a carrier travels. Bytes that never
 * move as emoji cannot be bitten by a variation selector, a zero-width joiner, a skin-tone modifier or
 * a client's own normalization, and a reader holding nothing but the file can still verify it. Keeping
 * the glyph vocabulary out of the encoding also keeps it REVISABLE: an alphabet frozen into the bytes
 * could never improve without invalidating every carrier ever written, where an alphabet used only to
 * render may be bettered in year three with every existing stamp still verifying.
 *
 * A PROJECTION carries the glyph-stamped form on disk — an FTLS Powers card, a character sheet, any
 * artifact the wiki renders for a reader rather than ships to a peer. A projection IS the rendered
 * surface, so the file on disk shows what the live wiki shows, and an operator comparing the two reads
 * one thing in both places. The at-a-glance stamp belongs where reading happens.
 *
 * Two spellings of one digest, each where it serves: the same law the house stands at every other
 * altitude — a private pet-name beside a declared Handle, `Aperture` beside `Focus`.
 *
 * ── WHAT A RELAY CAN DO WITH IT ─────────────────────────────────────────────────────────────────
 * Raw bytes, one scan, no parser and no canonicaliser. A Herm holding `pull` and not `read` verifies
 * this check over an offering it cannot open — the relay-law exception in `ability-implies` is exactly
 * the capability this instrument was shaped to fit.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

// The mesh already stands one sha256 for every platform this runs on; a second import would be a
// second spelling of one primitive, and the isomorphic surface is exactly where that costs most.
import { sha256HexSync } from "@lararium/mesh/crypto";

import { fencedSpans, maskedExec } from "./meme-ast/fence-mask.js";
import { frameMark } from "./frame-marks.js";

/**
 * How many hex characters the check carries.
 *
 * A block check answers "did these bytes survive the hop", never "did anyone alter this body" — that
 * second question belongs to the seal. Sixty-four bits sit far past what a transport fault reaches and
 * short enough that a person reads the line.
 */
export const BCC_HEX = 16;

/**
 * The span a check covers: STX opener through ETX closer, inclusive. Null when the frame is absent.
 *
 * READ THROUGH THE FENCE MASK, because this grammar teaches its own control set. The specification
 * memes carry worked examples of every mark inside quote fences, and a raw `indexOf` locks onto the
 * FIRST one it meets — which in those documents is an example, hundreds of lines above the body. Six
 * carriers verified that way: the reader confirmed a check written inside a teaching example and
 * reported `ok` while the carrier's own body went unexamined. The emitter never had that fault, since
 * it divides a carrier the way the deserializer does; this reader now meets it on one span.
 *
 * The head is the CONTROL glyph and only that. A matcher admitting the speaking head would accept a
 * malformed carrier in silence — and silence is this layer's whole danger, because an unmatched frame
 * reroutes to text rather than throwing.
 */
export function checkSpan(text: string): { start: number; end: number } | null {
  const spans = fencedSpans(text);
  const stxM = maskedExec(text, /<<\^(?:[^>\n]|->)*&#x0002;(?:[^>\n]|->)*>>/g, spans);
  if (!stxM) return null;
  const rest = text.slice(stxM.index);
  const etxM = maskedExec(rest, /<<\^(?:[^>\n]|->)*&#x0003;(?:[^>\n]|->)*>>/g, fencedSpans(rest));
  if (!etxM) return null;
  return { start: stxM.index, end: stxM.index + etxM.index + etxM[0].length };
}

/** The check over an already-isolated body span. */
export function bccOfSpan(span: string, namespace: string): string {
  return `${namespace.trim()}:${sha256HexSync(span).slice(0, BCC_HEX)}`;
}

/** The check a whole carrier should carry, or null where it holds no framed body. */
export function bccOf(text: string, namespace: string): string | null {
  const span = checkSpan(text);
  return span ? bccOfSpan(text.slice(span.start, span.end), namespace) : null;
}

/**
 * Whether the check a carrier carries matches the bytes it wraps.
 *
 * A carrier holding NO check reads `unchecked` rather than `false` — absence of a check and a failed
 * check are different facts, and collapsing them would make the reading useless exactly where it
 * matters. The caller decides what an unchecked carrier may do; graceful parsing says it still parses.
 */
export function verifyBcc(text: string): "ok" | "mismatch" | "unchecked" {
  const span = checkSpan(text);
  if (!span) return "unchecked";
  const trailing = /^[ \t]*([^\n]*:[0-9a-f]{16})/.exec(text.slice(span.end));
  if (!trailing) return "unchecked";
  const carried = trailing[1]!;
  const namespace = carried.slice(0, carried.lastIndexOf(":"));
  return bccOfSpan(text.slice(span.start, span.end), namespace) === carried ? "ok" : "mismatch";
}

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
 * A CARRIER holds the `ni:///sha-256;<base64url>` form — RFC 6920, full digest, canonical-or-reject —
 * because a carrier travels. Plain ASCII cannot be bitten by a variation selector, a zero-width joiner,
 * a skin-tone modifier or a client's own normalization, and a reader holding nothing but the file still
 * verifies it. Keeping every glyph vocabulary out of the encoding also keeps rendering REVISABLE: an
 * alphabet frozen into the bytes could never improve without invalidating every carrier ever written,
 * where an alphabet used only to render may be bettered in year three with every stamp still verifying.
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
 * One lexical scan — the frame recogniser read through the fence mask, so a quoted mark never frames.
 * No grammar, no rendering, no canonicaliser: the scan reads the carrier's QUOTING, never its meaning.
 * A Herm holding `pull` and not `read` runs that scan without opening what the carrier says — the
 * relay-law exception in `ability-implies` is exactly the capability this instrument was shaped to fit.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

// The mesh already stands one sha256 for every platform this runs on; a second import would be a
// second spelling of one primitive, and the isomorphic surface is exactly where that costs most.
import { sha256HexSync } from "@lararium/mesh/crypto";

import { fencedSpans, maskedExec } from "./meme-ast/fence-mask.js";
import { frameMark } from "./frame-marks.js";

/** The one digest algorithm this grammar accepts, named in the check and never chosen by it. */
export const CHECK_ALG = "sha-256";

/**
 * The check names its algorithm so a reader may KNOW, never so a message may CHOOSE.
 *
 * A verifier that dispatched on the algorithm a carrier declares would let the carrier pick its own
 * strength — the shape behind a decade of confusion attacks on token formats that trusted their own
 * `alg` field. So the allowlist lives here, on the reading side, and anything outside it refuses.
 */
const ACCEPTED_ALGS: ReadonlySet<string> = new Set([CHECK_ALG]);

/** base64url of a hex string — no padding, isomorphic, no Buffer. */
function hexToB64u(hex: string): string {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let bits = 0, acc = 0, out = "";
  for (let i = 0; i < hex.length; i += 2) {
    acc = (acc << 8) | parseInt(hex.slice(i, i + 2), 16);
    bits += 8;
    while (bits >= 6) { out += A[(acc >> (bits - 6)) & 63]; bits -= 6; }
  }
  if (bits > 0) out += A[(acc << (6 - bits)) & 63];
  return out;
}

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
/**
 * The frame's standing, before any digest: absent, torn, or framed.
 *
 * TORN names STX standing without ETX — a truncated transmission. It gets its own reading because the
 * conflation it prevents is the cheapest strip there is: cut a file ahead of its closer and a missing
 * check would otherwise read as lawful absence. Truncation and absence name different facts, and the
 * grammar's own bearing law spends a paragraph refusing exactly this collapse elsewhere.
 */
export type FrameStanding =
  | { kind: "absent" }
  | { kind: "torn" }
  | { kind: "framed"; start: number; end: number };

export function frameStanding(text: string): FrameStanding {
  const spans = fencedSpans(text);
  const stxM = maskedExec(text, /<<\^(?:[^>\n]|>(?!>))*&#x0002;(?:[^>\n]|>(?!>))*>>/g, spans);
  if (!stxM) return { kind: "absent" };
  const rest = text.slice(stxM.index);
  const etxM = maskedExec(rest, /<<\^(?:[^>\n]|>(?!>))*&#x0003;(?:[^>\n]|>(?!>))*>>/g, fencedSpans(rest));
  if (!etxM) return { kind: "torn" };
  return { kind: "framed", start: stxM.index, end: stxM.index + etxM.index + etxM[0].length };
}

export function checkSpan(text: string): { start: number; end: number } | null {
  const st = frameStanding(text);
  return st.kind === "framed" ? { start: st.start, end: st.end } : null;
}

/**
 * The check over an already-isolated body span, as a name that points at itself.
 *
 * The form is the shelves' own: an algorithm, then the full digest of the bytes it covers. A shelf's
 * name says the string it names lives elsewhere; this one says the string is the body directly above
 * it. Position is what tells them apart, and a resolver MUST NOT follow one found after ETX.
 *
 * FULL WIDTH, never truncated. Every system that stores a digest for machine verification stores all
 * of it and shortens only for a reader — and every truncation that got hurt had been sized against
 * accident and then met an adversary. `nihOfSpan` is the reader's form, derived and never stored.
 */
export function bccOfSpan(span: string): string {
  return `ni:///${CHECK_ALG};${hexToB64u(sha256HexSync(span))}`;
}

/**
 * The same check in the form RFC 6920 wrote for people: lowercase hex, and a Luhn mod-16 digit that
 * catches the transposition a hand actually makes.
 *
 * DERIVED, NEVER STORED. A carrier holds one spelling; this is what an instrument PRINTS when a person
 * has to read a check aloud or carry it to another screen. Two homes for one fact is the failure this
 * grammar keeps finding, so the second home is a moment rather than a place.
 */
export function nihOfSpan(span: string): string {
  const hex = sha256HexSync(span);
  let sum = 0, factor = 2;
  for (let i = hex.length - 1; i >= 0; i--) {
    const addend = factor * parseInt(hex[i]!, 16);
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(addend / 16) + (addend % 16);
  }
  return `nih:///${CHECK_ALG};${hex};${((16 - (sum % 16)) % 16).toString(16)}`;
}

/** The check a whole carrier should carry, or null where it holds no framed body. */
export function bccOf(text: string): string | null {
  const span = checkSpan(text);
  return span ? bccOfSpan(text.slice(span.start, span.end)) : null;
}

/**
 * Whether the check a carrier carries matches the bytes it wraps.
 *
 * A carrier holding NO check reads `unchecked` rather than `false` — absence of a check and a failed
 * check are different facts, and collapsing them would make the reading useless exactly where it
 * matters. The caller decides what an unchecked carrier may do; graceful parsing says it still parses.
 */
export function verifyBcc(text: string): "ok" | "mismatch" | "unchecked" | "torn" {
  const st = frameStanding(text);
  if (st.kind === "absent") return "unchecked";
  if (st.kind === "torn") return "torn";
  const span = st;
  // ADJACENT, exactly. The check follows the closed sigil with nothing between — the emitter mints it
  // so, and slack here would let two byte-different files share one verdict. A shifted check reads as
  // postamble content: it does not verify, and the projection re-mints it adjacent.
  const trailing = /^(ni:\/\/\/([a-z0-9-]+);([A-Za-z0-9_-]+))/.exec(text.slice(span.end));
  if (!trailing) return "unchecked";
  // The message names its algorithm; this reader decides whether to accept it.
  if (!ACCEPTED_ALGS.has(trailing[2]!)) return "mismatch";
  // CANONICAL OR REJECT. base64url admits several spellings of a value whose bit-length is not a
  // multiple of six, so a comparator that tolerated them would call two different strings one check.
  // Re-encoding what we computed and comparing whole refuses every non-canonical spelling for free.
  return bccOfSpan(text.slice(span.start, span.end)) === trailing[1]! ? "ok" : "mismatch";
}

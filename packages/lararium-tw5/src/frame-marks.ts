/**
 * frame-marks — the carrier frame's control marks, declared once.
 *
 * ── WHAT COLLAPSES HERE, AND WHAT DELIBERATELY DOES NOT ─────────────────────────────────────────
 * Six places held the frame: the bootstrap scanner, the stream framer, the deserializer's own scans,
 * the block-check, the emitter, and the `sigil-frame-*` tiddlers. One fact, six spellings, and a mark
 * added to five of them reads correct in every file while the sixth quietly drops it.
 *
 * The COD ES collapse. They are one fact and they drift as one — a mark either stands in this grammar
 * or it does not, and every reader and the writer must agree on which.
 *
 * The PATTERNS do not, and the difference is scarred rather than accidental:
 *   · the stream framer scans `(?:[^>\n]|->)*` — a sigil NEVER crosses a line, because the multi-line
 *     form once let a quoted `<<~` mention swallow text down to a distant real sigil;
 *   · the bootstrap scanner scans `(?:[^>]|->)*` — it runs before grammar loads and takes the wider
 *     read deliberately;
 *   · the deserializer's SOH scan anchors `[^&\n]*` — anchoring on the control code, because an
 *     any-control-char form swallows the whole header whenever the SOH carries a namespace it cannot see.
 *
 * Collapsing those into one regex would re-introduce three bugs their comments record. So this module
 * carries the CODE and the NAME; each reader keeps the scan its own context earned.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

/** One control mark: the entity a carrier writes, the name it answers to, the slots it carries. */
export interface FrameMark {
  /** The HTML entity form as it stands in a carrier. */
  readonly code: string;
  /** The mark's name in the received framing. */
  readonly name: string;
  /** Slot names this mark carries, in order. Empty when the mark carries none. */
  readonly slots: readonly string[];
}

/**
 * Every mark the grammar stands, in transmission order.
 *
 * `frame-parity` reads this against the spec's control-set table and against the `sigil-frame-*`
 * tiddlers, so a mark added here and nowhere else fails rather than passing quietly.
 */
export const FRAME_MARKS: readonly FrameMark[] = [
  { code: "&#x0001;", name: "SOH",  slots: ["namespace", "bearing", "uri"] },
  { code: "&#x0011;", name: "SOH2", slots: ["namespace", "bearing", "uri"] },
  { code: "&#x0002;", name: "STX",  slots: [] },
  { code: "&#x0003;", name: "ETX",  slots: ["bcc"] },
  { code: "&#x0017;", name: "ETB",  slots: ["hash"] },
  { code: "&#x0004;", name: "EOT",  slots: ["target"] },
  { code: "&#x0014;", name: "EOT2", slots: ["target"] },
] as const;

/** The mark a code names, or undefined where the grammar stands none. */
export function frameMark(code: string): FrameMark | undefined {
  return FRAME_MARKS.find((m) => m.code === code);
}

/** Codes only — for a reader building its own scan around a shared set. */
export const FRAME_CODES: readonly string[] = FRAME_MARKS.map((m) => m.code);

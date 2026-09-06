/**
 * ahu-scan — single source of truth for ahu sigil block recognition.
 *
 * Three callers consume this module identically:
 *   - `@lararium/tw5/src/deserializer.ts` (CLI / sync ingest)
 *   - `@lararium/tw5/src/widgets/lar-meme-split.ts` (TW5 UX save)
 *   - `@lararium/tw5/src/wikirules/memetic-wikitext-sigil.ts` (render-time
 *      parse via TW5 wikifier)
 *
 * One regex pair, one balanced-bracket scanner, one slot-path composer —
 * any drift between callers is a bug, so they share this module.
 *
 * Schema: lar:///ha.ka.ba/lares/api/lararium/schema/ahu-scan
 */

import { fencedSpans, maskedExecAll } from "./fence-mask.js";

/**
 * Slot identifier — supports nested fragment paths via `/`-separated
 * segments per memetic-wikitext spec §nested-ahu and lar-uri.md §5.6.
 *
 * `<<~ ahu #parent/child/grandchild>>` opens a slot whose URI reads
 * `parentURI#/parent/child/grandchild` — single-hash invariant; the
 * fragment-path is the addressable hierarchy.
 */
export const AHU_OPEN_RE  = /<<~[^>]*\bahu\s+(#\/?[\w-]+(?:\/[\w-]+)*)(?:\s+->\s+\S+)?\s*>>/g;
export const AHU_CLOSE_RE = /<<~\/ahu\s*>>/g;

/**
 * Ahu slot names that carry structural metadata, not addressable content.
 * They dissolve into the parent or are structural-only — not split into
 * child tiddlers. Per memetic-wikitext.md §161 (Ahu Control Slots).
 */
export const CONTROL_SLOTS: ReadonlySet<string> = new Set([
  "#meta", "#exit",
  "#stream-open", "#stream-close", "#stream-exit",
  "#body-open", "#body-close", "#meme-body-open", "#meme-body-close",
]);

export interface AhuBlock {
  /** Source position of the opening `<<~` */
  readonly openStart: number;
  /** Position just after the opening `>>` (start of body bytes) */
  readonly bodyStart: number;
  /** Position of the closing `<<~/ahu` (end of body bytes) */
  readonly bodyEnd:   number;
  /** Position just after the closing `>>` (end of full block) */
  readonly closeEnd:  number;
  /** Slot identifier with leading `#`, e.g. `#thesis` or `#/parent/child` */
  readonly slot:      string;
}

/**
 * Scan top-level ahu blocks. Nested ahu blocks remain inside their parent's
 * `[bodyStart, bodyEnd)` span; callers walk recursively when they need
 * full-depth flattening.
 *
 * Balanced-bracket pairing: openers/closers go onto a stack; an unmatched
 * closer is dropped silently (caller's error to recover). Ties on position
 * resolve by event order — opener emits before closer.
 */
export function findTopLevelAhuBlocks(text: string): AhuBlock[] {
  // Quoted sigils never open or close a block: a fenced or inline-code
  // `<<~ ahu …>>` is the operator SHOWING the grammar, not using it
  // (fence-mask law).
  const mask = fencedSpans(text);
  const events: Array<{ kind: "open" | "close"; pos: number; end: number; slot: string }> = [];
  for (const m of maskedExecAll(text, AHU_OPEN_RE, mask)) {
    events.push({ kind: "open", pos: m.index, end: m.index + m[0].length, slot: m[1] ?? "#" });
  }
  for (const m of maskedExecAll(text, AHU_CLOSE_RE, mask)) {
    events.push({ kind: "close", pos: m.index, end: m.index + m[0].length, slot: "" });
  }
  events.sort((a, b) => a.pos - b.pos);

  const blocks: AhuBlock[] = [];
  const stack: Array<{ openStart: number; bodyStart: number; slot: string }> = [];
  for (const ev of events) {
    if (ev.kind === "open") {
      stack.push({ openStart: ev.pos, bodyStart: ev.end, slot: ev.slot });
    } else {
      const opener = stack.pop();
      if (!opener) continue;
      if (stack.length === 0) {
        blocks.push({
          openStart: opener.openStart,
          bodyStart: opener.bodyStart,
          bodyEnd:   ev.pos,
          closeEnd:  ev.end,
          slot:      opener.slot,
        });
      }
    }
  }
  return blocks;
}

/**
 * Collect every ahu slot name a carrier declares — top-level and nested,
 * across the whole text — skipping quoted (fenced/inline-code) sigils and the
 * structural CONTROL_SLOTS (which carry no addressable body). The gate reads
 * this to guard its canonical-equivalence NOOP: a slot the disk declares that
 * the round-trip render drops names a LOSSY shore, never a cosmetic edit —
 * so a dropped slot MUST NOT read as canonical-equivalent (the ahu-drop guard).
 */
export function collectAhuSlots(text: string): Set<string> {
  const mask = fencedSpans(text);
  const slots = new Set<string>();
  for (const m of maskedExecAll(text, AHU_OPEN_RE, mask)) {
    const slot = m[1] ?? "#";
    if (!CONTROL_SLOTS.has(slot)) slots.add(slot);
  }
  return slots;
}

/**
 * Compose a fragment-path slot identifier under an enclosing prefix.
 *
 *   composeSlotPath("",          "#thesis")   → "#/thesis"         (root child, a PATH)
 *   composeSlotPath("#parent",   "#child")    → "#/parent/child"   (one nested, a PATH)
 *   composeSlotPath("#/a/b",     "#c")        → "#/a/b/c"          (two nested)
 *
 * TWO GRAMMARS SHARE THE FRAGMENT SPACE, PARTED BY THE FIRST CHARACTER — the split JSON Schema
 * draws between a JSON Pointer (`#/$defs/x`) and an `$anchor` (`#x`), reached here for the same
 * reason: a reader and a parser tell them apart without lookahead.
 *
 *   `#/a`      a ROOTED PATH — EVERY ahu section, at every depth. `#/entry`, `#/observe/observe-ha`.
 *   `#name`    a PLAIN-NAME ANCHOR, and the house claims none of them. The whole bare space stays
 *              free for the anchors a live wiki renders on a page — HTML ids, and whatever else
 *              wants to name a spot rather than a section.
 *
 * A section is always a path, so the slash is always there. One shape, one reading, no depth-one
 * exception to remember.
 *
 * `/` rides a fragment unescaped by RFC 3986 §3.5 (`fragment = *( pchar / "/" / "?" )`), and a
 * media type may define structure within it; `#` may not repeat, so a nested address could never
 * have taken the `#a#b` shape.
 *
 * Slot identifiers carrying their own `/`-paths (operator-authored pre-flattened) get appended
 * verbatim under the prefix.
 */
export function composeSlotPath(prefix: string, slot: string): string {
  const tail = slot.startsWith("#") ? slot.slice(1) : slot;
  if (!prefix) return `#/${tail.replace(/^\//, "")}`;         // a root child is a path too
  const slotTail = slot.startsWith("#") ? slot.slice(1) : slot;
  const rooted   = prefix.startsWith("#/") ? prefix : `#/${prefix.slice(1)}`;
  return `${rooted}/${slotTail}`;
}

/**
 * lar-sigil-shared — shared helpers for the three lar-sigil wikirule
 * modules (lar-sigil-block, lar-sigil-inline, lar-declaration).
 *
 * Each rule file lives in its own module-type:wikirule tiddler so TW5's
 * standard plugin loader registers them via the canonical
 * `WikiParser.createClassesFromModules` path (reads `exports.types.{block
 * |inline|pragma}` to classify the rule). This shared file is bundled by
 * Vite into each rule's CJS output (no separate module-type:wikirule
 * tiddler — Vite inlines the imports).
 */

import type { GrammarRules } from "../meme-ast/types.js";
import type { MemeDiagnostic } from "../meme-ast/diagnostics.js";

export interface ParseTreeNode {
  readonly type:        string;
  readonly attributes?: Record<string, { type: "string"; value: string }>;
  readonly children?:   ParseTreeNode[];
  readonly text?:       string;
}

export interface WikiParser {
  source: string;
  pos:    number;
  /** The core parse-diagnostics hook: a rule surfaces a recovery it performed rather than swallowing it. */
  addDiagnostic?: (diagnostic: MemeDiagnostic) => void;
}

export interface RuleInstance {
  parser:    WikiParser | null;
  matchPos?: number;
  matchEnd?: number;
  /** For ahu blocks: parsed attributes. For literal-survival: { __literal__ }. */
  attrs?:    Record<string, string>;
}

// Two opener marks, one decision on the THIRD character: `~` opens the speaking set (the sharktooth
// carries a verb), `^` opens the CONTROL set (caret notation — `^A`=SOH, `^B`=STX, `^C`=ETX, `^D`=EOT,
// the received way of writing exactly these characters since teletypes). One character still decides,
// five ways: `<<~` sigil · `<<^` control · `<<!` declaration · `<<<` quote fence · `<<x` macrocall.
// `!` never opens a macro name, so the fifth costs the one-character decision nothing.
export const SIGIL_OPEN_MARKS = "~^";
/** True when a sigil of EITHER set opens at `pos`. */
export function opensSigilAt(source: string, pos: number): boolean {
  return source.startsWith("<<~", pos) || source.startsWith("<<^", pos);
}
/** The next opener of either set at or after `from`, or -1. */
export function indexOfSigilOpen(source: string, from: number): number {
  const a = source.indexOf("<<~", from);
  const b = source.indexOf("<<^", from);
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}
export const ANY_OPEN_RE = /<<[~^][^\n]*?>>/g;

// Child-slot sigil names present at bootstrap (before grammar loads from tiddlers).
// ahu: deserializer emits <<~ ahu …>>…<<~/ahu>> blocks; must be recognised at cold boot.
// kau: TW5 \widget tiddler (sigil-kau.tid), only appears in live wiki (post-grammar-load); grammar supplies it via kind="child-slot".
const BUILTIN_CHILD_SLOTS = new Set<string>(["ahu"]);

/** Returns the set of child-slot sigil names from the grammar registry. */
export function grammarChildSlotNames(grammar: GrammarRules | null): Set<string> {
  if (!grammar) return BUILTIN_CHILD_SLOTS;
  const out = new Set<string>(BUILTIN_CHILD_SLOTS);
  for (const sigil of grammar.sigils) {
    if ((sigil as { kind?: string }).kind === "child-slot") out.add(sigil.name);
  }
  return out;
}

export interface CompoundSigilMatch {
  readonly start:    number;
  readonly end:      number;
  readonly name:     string;        // dispatch name: "kahea~ahu" | "kahea" | "ahu" | "loulou" | …
  readonly p1:       string;        // first positional arg (slot, uri, or raw args)
  readonly closeKey: string | null; // BLOCK_CLOSERS key for body capture: word1 for compound+bare-slot, null for leaf
}

// Matches <<~ WORD [WORD2] ARGS>> for any simple sigil invocation.
// Does not match pranala (arrow syntax, handled by matchPranalaOpenAt).
// Does not match control chars or <<~! pragma forms (no leading \s+ match).
const COMPOUND_OPEN_RE = /<<~\s+(\\?[\w-]+)(?:\s+([^\n]*?))?\s*>>/g;

/**
 * Generic compound-sigil opener for the matchAhuOpenAt + matchUriFormSigilAt
 * forms. Child-slot detection uses the grammar registry
 * rather than hardcoded names, so new slot types (kau, future) require
 * only a TOML [[sigils]] entry with kind="child-slot".
 *
 *   <<~ ahu #slot>>           → name="ahu",       p1="#slot",  slotType="ahu"
 *   <<~ kahea ahu #slot>>     → name="kahea~ahu", p1="#slot",  slotType="ahu"
 *   <<~ aka   ahu #slot>>     → name="aka~ahu",   p1="#slot",  slotType="ahu"
 *   <<~ kahea lar:///uri>>    → name="kahea",     p1=uri,      slotType=null
 *   <<~ loulou lar:///uri>>   → name="loulou",    p1=uri,      slotType=null
 *   <<~ kau #dev DeviceName>> → name="kau",       p1=rest,     closeKey="kau"
 *   <<~ kahea kau #dev>>      → name="kahea~kau", p1="#dev",   closeKey="kahea"
 */
export function matchCompoundSigilAt(
  source:         string,
  start:          number,
  childSlotNames: Set<string>,
): CompoundSigilMatch | null {
  COMPOUND_OPEN_RE.lastIndex = start;
  const m = COMPOUND_OPEN_RE.exec(source);
  if (!m || m.index !== start) return null;
  const word1 = m[1]!.replace(/^\\/, "");
  // PRANALA CARRIES TWO TYPED ENDS. This reader hands back one undifferentiated `rest`, and an edge
  // needs its `from` told apart from its `to`: whoever reads whichever address comes first reads the
  // SOURCE, and a graph built on that points backwards. `matchPranalaOpenAt` types the two ends, so
  // pranala routes there.
  if (word1 === "pranala") return null;
  const rest = (m[2] ?? "").trim();

  if (childSlotNames.has(word1)) {
    // bare child-slot: <<~ ahu #slot>> or <<~ kau #device …>>
    return { start: m.index, end: COMPOUND_OPEN_RE.lastIndex, name: word1, p1: rest, closeKey: word1 };
  }
  // peek at the first token of rest to detect a compound: <<~ kahea ahu #slot>>
  const spaceIdx  = rest.search(/\s/);
  const word2     = spaceIdx >= 0 ? rest.slice(0, spaceIdx) : rest;
  const remainder = spaceIdx >= 0 ? rest.slice(spaceIdx).trim() : "";
  if (word2 && childSlotNames.has(word2)) {
    // closeKey = word1 (e.g. "kahea") — the compound block closes with <<~/kahea>>, not <<~/ahu>>
    return { start: m.index, end: COMPOUND_OPEN_RE.lastIndex, name: `${word1}~${word2}`, p1: remainder, closeKey: word1 };
  }
  // simple leaf: <<~ kahea lar:///uri>> or <<~ loulou …>>
  return { start: m.index, end: COMPOUND_OPEN_RE.lastIndex, name: word1, p1: rest, closeKey: null };
}

/**
 * Pranala edge sigil — explicit edge with from/to and optional slot/family/role.
 *
 * Inline form:  `<<~ pranala #name? from=A -> to=B [family=f] [role=r]>>`
 * Block form:   `<<~ pranala #name? from=A -> to=B>>body<<~/pranala>>`
 *
 * The two forms share opener parsing; closer presence distinguishes them.
 */
export const PRANALA_OPEN_RE = /<<~\s*pranala\s+(?:(#[\w-]+)\s+)?from=(\S+)\s*->\s*to=(\S+)((?:\s+\w+=[^\s>]+)*)\s*>>/g;

export interface PranalaOpenMatch {
  readonly start:  number;
  readonly end:    number;
  readonly slot:   string | null;
  readonly from:   string;
  readonly to:     string;
  readonly attrs:  Record<string, string>;
}

export function matchPranalaOpenAt(source: string, start: number): PranalaOpenMatch | null {
  PRANALA_OPEN_RE.lastIndex = start;
  const m = PRANALA_OPEN_RE.exec(source);
  if (!m || m.index !== start) return null;
  const [, slot, from, to, tail] = m;
  const attrs: Record<string, string> = {};
  if (tail) {
    const attrRe = /(\w+)=([^\s>]+)/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(tail)) !== null) {
      attrs[am[1]!] = am[2]!;
    }
  }
  return {
    start: m.index,
    end:   PRANALA_OPEN_RE.lastIndex,
    slot:  slot ?? null,
    from:  from!,
    to:    to!,
    attrs,
  };
}

/**
 * Block sigils whose closing tag we recognize for body capture. The body
 * text rides through the parse tree as literal source so the disk render
 * preserves it; it's not used for widget rendering of non-ahu sigils today.
 */
/**
 * Boot-minimum static closers. Only sigils that must be recognised BEFORE the
 * grammar tiddlers finish loading belong here. Everything else loads dynamically
 * via buildClosers() + closePatternToTag() from the TOML registry.
 *
 * Boot-critical:
 *   ahu      — deserializer emits <<~ ahu …>>…<<~/ahu>> blocks at cold boot
 *   pranala  — permanent JS exception; no TOML entry; always static
 *   kahea    — kahea-invoke block form needed before grammar tiddlers load
 *
 * helu + \\function are leaf-only pragmas (no TOML close_pattern); they do not
 * appear here. If a future grammar version adds a block form, TOML gains
 * close_pattern and buildClosers() picks it up automatically.
 */
export const BLOCK_CLOSERS: Record<string, string> = {
  ahu:     "<<~/ahu",
  pranala: "<<~/pranala",
  kahea:   "<<~/kahea",
};

export function findCloseEnd(
  source: string,
  sigil: string,
  fromPos: number,
  closers: Record<string, string> = BLOCK_CLOSERS,
): number | null {
  const tag = closers[sigil];
  if (!tag) return null;
  const idx = source.indexOf(tag, fromPos);
  if (idx === -1) return null;
  const closingEnd = source.indexOf(">>", idx + tag.length);
  if (closingEnd === -1) return null;
  return closingEnd + 2;
}

export function findGenericOpenAt(source: string, start: number): { end: number; sigil: string | null } | null {
  if (!opensSigilAt(source, start)) return null;
  ANY_OPEN_RE.lastIndex = start;
  const m = ANY_OPEN_RE.exec(source);
  if (!m || m.index !== start) return null;
  const inner = source.slice(start + 3, m.index + m[0].length - 2).trim();
  const kwMatch = inner.match(/^[!⊙]?(?:&#x[0-9a-fA-F]+;)?\s*(\\?[a-zA-Z][\w-]*)?/);
  const sigil = kwMatch?.[1]?.replace(/^\\/, "") ?? null;
  return { end: m.index + m[0].length, sigil };
}


export function attrToTree(attrs: Record<string, string>): Record<string, { type: "string"; value: string }> {
  const out: Record<string, { type: "string"; value: string }> = {};
  for (const [k, v] of Object.entries(attrs)) out[k] = { type: "string", value: v };
  return out;
}

/**
 * Convert a TOML close_pattern regex string to a literal indexOf tag.
 * TOML stores e.g. `'<<~\/ahu\s*>>'`; findCloseEnd needs `"<<~/ahu"`.
 * Strategy: strip regex escapes and trim trailing whitespace/>> quantifiers.
 *
 * Pattern: remove `\/` → `/`, remove `\s*>>` → `` (we search for the opener
 * tag only — findCloseEnd does its own indexOf(">>", …) scan for the close).
 * If the result does not start with `<<~/`, derivation failed; return null.
 */
export function closePatternToTag(pattern: string): string | null {
  // strip surrounding quotes if present (defensive)
  const raw = pattern.replace(/^['"]|['"]$/g, "");
  // unescape regex special chars we expect: \/ → /
  const unescaped = raw.replace(/\\\//g, "/");
  // strip trailing `\s*>>` or `\s+>>` or `>>` — we only need the prefix tag
  const tag = unescaped.replace(/\\s[*+]?>?>?$/, "").replace(/>>$/, "").trimEnd();
  if (!tag.startsWith("<<~/")) return null;
  return tag;
}

/**
 * Merge BLOCK_CLOSERS with grammar-registered block sigils.
 *
 * closePatternToTag() converts TOML regex close_pattern strings to the literal
 * indexOf tags that findCloseEnd requires. Grammar entries whose names match
 * BLOCK_CLOSERS keys are skipped — the static list remains authoritative for
 * boot-critical sigils (ahu, pranala, kahea). Grammar entries for
 * operator-added sigils extend the map at runtime.
 *
 * Name normalisation:
 *   \\name → name  (pragma-form sigils, e.g. "\\procedure" → "procedure")
 *
 * SharktoothSigil tiddlers carry canonical names directly (e.g. "kahea"). The
 * sigil-kahea tiddler merges both leaf and block forms under one name.
 */
export function buildClosers(grammar: GrammarRules | null): Record<string, string> {
  if (!grammar) return BLOCK_CLOSERS;
  const extra: Record<string, string> = {};
  for (const sigil of grammar.sigils) {
    if (!sigil.closePattern) continue;
    const name = sigil.name.replace(/^\\/, "");
    if (name in BLOCK_CLOSERS) continue;
    const tag = closePatternToTag(sigil.closePattern);
    if (tag) extra[name] = tag;
  }
  return Object.keys(extra).length === 0 ? BLOCK_CLOSERS : { ...BLOCK_CLOSERS, ...extra };
}

/**
 * Returns the set of inline/edge sigil names registered in the grammar.
 * Used by the generic fallback in lar-sigil findNextMatch as a safety net for
 * <<~WORD>> forms (no space) that compound does not claim. Well-formed HUD
 * sigils use <<~ WORD …>> (space) and are consumed by matchCompoundSigilAt
 * before the generic path fires.
 */
export function grammarInlineSigils(grammar: GrammarRules | null): Set<string> {
  if (!grammar) return new Set();
  const out = new Set<string>();
  for (const sigil of grammar.sigils) {
    if (
      (sigil.kind === "edge" || sigil.kind === "edge-sugar" || sigil.kind === "edge-alias") &&
      sigil.inlinePattern
    ) {
      out.add(sigil.name);
    }
  }
  return out;
}

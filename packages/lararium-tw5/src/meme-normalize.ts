/**
 * meme-normalize — canonicalize a meme carrier's framing for round-trip stability.
 *
 * The doctrine: corpus files stay "non-canonical at rest until a deliberate
 * normalization commit" (wiki-layer-ontology; the meme-corpus-roundtrip laws).
 * A freshly-authored or lifted carrier MAY drift from canonical form; this
 * gesture homes it back so the lens laws (single-closer · content-whole ·
 * idempotent) hold — rather than loosening the gate that guards the graph.
 *
 * Classes closed here (the ones a hand-authored or lifted carrier most often trips):
 *   1. **SOH opener.** The opener canonicalizes to `<<^ [namespace-glyphs]&#x0001;`
 *      — one space after `<<^`, then the iam-declared namespace as LITERAL glyphs
 *      (or none), then the SOH char. Two drifts trip it: a missing/stale namespace
 *      (the renderer re-injects → round-trip breaks), and a missing space
 *      (`<<^ &#x0001;`, the lifted-corpus form — 10 stragglers against 102 canonical
 *      siblings). The iam field is authoritative; the SOH is derived from it.
 *   2. **Register band.** The iam `register` expands its band CODE (P · PS · S ·
 *      SC · C) to the canonical band word (Provisional … Canon). A value OFF the
 *      register ladder — a stage code like `CS` (GR/OS/US/CS/DS), a freeform
 *      phrase — is LEFT UNTOUCHED and FLAGGED: stage ≠ register (independent
 *      axes), so the gate surfaces it for human triage rather than fusing two
 *      scales by guessing.
 *
 * Pure + idempotent (re-running changes nothing). The SOH grammar mirrors the
 * deserializer's namespace extractor (`deserializer.ts`, `/^<<\^([^&\n]*)&#x(0001|0011)/`).
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/meme-normalize
 */

/** `<<^ [namespace-glyphs]&#x0001;` — capture prefix · current namespace · SOH char. */
const SOH_OPENER_RE = /(<<\^)\s*([^&\n]*?)\s*(&#x(?:0001|0011);)/;

/** Decode `&#xNNNN;` entities to literal glyphs; non-entity chars pass through. */
function decodeEntities(s: string): string {
  return s.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
}

/** The toml iam fence body (between the ```toml iam fences), or null if absent. */
function iamFence(src: string): RegExpExecResult | null {
  return /(```toml iam\n)([\s\S]*?)(\n```)/.exec(src);
}
type RegExpExecResult = RegExpExecArray;

/** The iam `namespace` value (raw, possibly entity-encoded), or null if absent. */
function iamNamespace(src: string): string | null {
  const fence = iamFence(src);
  if (!fence) return null;
  const m = /^[ \t]*namespace[ \t]*=[ \t]*"([^"]*)"/m.exec(fence[2]!);
  return m ? m[1]! : null;
}

/** Register band CODE → canonical band word (the register ladder, #l-prime). */
const REGISTER_CODES: Record<string, string> = {
  P: "Provisional",
  PS: "Provisional-Synthesis",
  S: "Synthesis",
  SC: "Synthesis-Canon",
  CS: "Synthesis-Canon", // old transposed form of SC
  C: "Canon",
};
const REGISTER_BANDS = new Set(Object.values(REGISTER_CODES));

export interface NormalizeResult {
  readonly text: string;
  readonly changed: boolean;
  readonly notes: readonly string[];
  /** Non-fatal observations the gate will NOT auto-fix — surfaced for human triage. */
  readonly flags: readonly string[];
}

/**
 * Canonicalize a single-carrier meme source. Returns the normalized text, a
 * `changed` flag, and human-readable notes naming each transform applied.
 */
export function normalizeMemeSource(src: string): NormalizeResult {
  const notes: string[] = [];
  const flags: string[] = [];
  let text = src;

  // ── 1. SOH opener (namespace embed + spacing) ────────────────────────────
  const nsRaw = iamNamespace(text);
  const want = nsRaw === null ? "" : decodeEntities(nsRaw).trim();
  const soh = SOH_OPENER_RE.exec(text);
  if (soh) {
    const have = soh[2]!;
    // Canonical opener: `<<^ ` + literal namespace glyphs + the SOH char. Compare
    // the WHOLE matched opener, not just the namespace — so a missing space
    // (`<<^ &#x0001;`) canonicalizes even when the namespace already matches.
    const rebuilt = `${soh[1]} ${want}${soh[3]}`;
    if (soh[0]! !== rebuilt) {
      text = text.slice(0, soh.index) + rebuilt + text.slice(soh.index + soh[0]!.length);
      notes.push(have !== want
        ? (want ? `SOH namespace homed to "${want}" (from iam)` : `SOH namespace cleared (iam declares none)`)
        : `SOH opener spacing canonicalized`);
    }
  }

  // ── 2. Register band (code → word; off-ladder → flag) ────────────────────
  const fence = iamFence(text);
  if (fence) {
    const regRe = /^([ \t]*register[ \t]*=[ \t]*")([^"]*)(")/m;
    const rm = regRe.exec(fence[2]!);
    if (rm) {
      const val = rm[2]!.trim();
      const canon = REGISTER_CODES[val];
      if (canon) {
        const newBody = fence[2]!.replace(regRe, `$1${canon}$3`);
        text = text.slice(0, fence.index) + fence[1]! + newBody + fence[3]! +
          text.slice(fence.index + fence[0]!.length);
        notes.push(`register "${val}" expanded to "${canon}"`);
      } else if (val !== "" && !REGISTER_BANDS.has(val)) {
        // Off the register ladder — a stage code (CS), a freeform phrase, a
        // confidence-suffixed value. Never guessed into a band; flagged.
        flags.push(`register "${val}" off the band ladder — needs triage (not a register band)`);
      }
    }
  }

  return { text, changed: text !== src, notes, flags };
}

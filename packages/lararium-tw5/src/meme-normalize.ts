/**
 * meme-normalize — canonicalize a meme carrier's framing for round-trip stability.
 *
 * The doctrine: corpus files stay "non-canonical at rest until a deliberate
 * normalization commit" (wiki-layer-ontology; the meme-corpus-roundtrip laws).
 * A freshly-authored carrier MAY drift from canonical form; this gesture homes
 * it back so the lens laws (single-closer · content-whole · idempotent) hold —
 * rather than loosening the gate that guards the graph.
 *
 * Class closed here (the one a hand-authored carrier most often trips):
 *   **SOH namespace embed.** When the iam declares a `namespace`, the SOH opener
 *   MUST carry it as LITERAL glyphs, homed directly before the SOH control char
 *   — every canonical sibling does (`<<~ ⊙&#x0001; …`). A carrier whose SOH omits
 *   its declared namespace (or carries a stale one) makes the renderer inject it,
 *   so the round-trip drifts and idempotence breaks. The iam field is
 *   authoritative; the SOH is derived from it.
 *
 * Pure + idempotent (re-running changes nothing). The SOH grammar mirrors the
 * deserializer's namespace extractor (`deserializer.ts`, `/^<<~([^&\n]*)&#x(0001|0011)/`).
 *
 * Meme: lar:///ha.ka.ba/@lararium/v0.1/tw5/meme-normalize
 */

/** `<<~ [namespace-glyphs]&#x0001;` — capture prefix · current namespace · SOH char. */
const SOH_OPENER_RE = /(<<~)\s*([^&\n]*?)\s*(&#x(?:0001|0011);)/;

/** Decode `&#xNNNN;` entities to literal glyphs; non-entity chars pass through. */
function decodeEntities(s: string): string {
  return s.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
}

/** The iam `namespace` value (raw, possibly entity-encoded), or null if absent. */
function iamNamespace(src: string): string | null {
  const fence = /```toml iam\n([\s\S]*?)\n```/.exec(src);
  if (!fence) return null;
  const m = /^[ \t]*namespace[ \t]*=[ \t]*"([^"]*)"/m.exec(fence[1]!);
  return m ? m[1]! : null;
}

export interface NormalizeResult {
  readonly text: string;
  readonly changed: boolean;
  readonly notes: readonly string[];
}

/**
 * Canonicalize a single-carrier meme source. Returns the normalized text, a
 * `changed` flag, and human-readable notes naming each transform applied.
 */
export function normalizeMemeSource(src: string): NormalizeResult {
  const notes: string[] = [];
  let text = src;

  // ── SOH namespace embed ──────────────────────────────────────────────────
  const nsRaw = iamNamespace(text);
  const want = nsRaw === null ? "" : decodeEntities(nsRaw).trim();
  const soh = SOH_OPENER_RE.exec(text);
  if (soh) {
    const have = soh[2]!;
    if (have !== want) {
      // Canonical opener: `<<~ ` + literal namespace glyphs + the SOH char.
      const rebuilt = `${soh[1]} ${want}${soh[3]}`;
      text = text.slice(0, soh.index) + rebuilt + text.slice(soh.index + soh[0]!.length);
      notes.push(want
        ? `SOH namespace homed to "${want}" (from iam)`
        : `SOH namespace cleared (iam declares none)`);
    }
  }

  return { text, changed: text !== src, notes };
}

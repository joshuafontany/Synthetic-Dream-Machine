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
 *   1. **SOH opener.** The opener canonicalizes to `<<^ code="&#x0001;" namespace="[namespace-glyphs]" `
 *      — one space after `<<^`, then the meta-declared namespace as LITERAL glyphs
 *      (or none), then the SOH char. Two drifts trip it: a missing/stale namespace
 *      (the renderer re-injects → round-trip breaks), and a missing space
 *      (`<<^ code="&#x0001;" `, the lifted-corpus form — 10 stragglers against 102 canonical
 *      siblings). The meta field is authoritative; the SOH is derived from it.
 *   2. **Sigil close spacing.** A close carrying whitespace before `>>` tightens.
 *      The reader takes both spellings; the writer emits one.
 *
 * Pure + idempotent (re-running changes nothing). The SOH grammar mirrors the deserializer's own
 * param-aware SOH scan (`deserializer.ts`).
 *
 * Meme: lar:///ha.ka.ba/lararium/tw5/meme-normalize
 */

/**
 * The whole SOH opener, up to its closing `>>`, with the namespace param captured where one stands.
 *
 * The opener carries NAMED PARAMS, so canonicalizing it means rewriting the param list rather than
 * splicing glyphs in front of a control entity. Matching the whole head lets one rebuild place the
 * namespace correctly whether the carrier states one, states a stale one, or states none at all.
 */
/**
 * The declaration a carrier opens with.
 *
 * SPELLED HERE, not imported, and the constraint is structural rather than stylistic: this module gets
 * BUNDLED INTO THE TW5 PLUGIN, so an import from the mesh package would pull that package's automerge
 * wasm into a bundle that cannot carry it. The whole file stays dependency-free for that reason.
 *
 * `type-parity` holds the two spellings together — it reads every literal declaration in the tree
 * against the one authority, so this copy cannot drift without a witness saying so.
 */
const DECLARATION =
  "<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext>>";

const SOH_OPENER_RE =
  /(<<\^)[ \t]*(?:code="(&#x(?:0001|0011);)"(?:[ \t]+namespace="([^"]*)")?|([^&\n]*?)(&#x(?:0001|0011);))/;

/** Decode `&#xNNNN;` entities to literal glyphs; non-entity chars pass through. */
function decodeEntities(s: string): string {
  return s.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
}

/** The toml meta fence body (between the ```toml meta fences), or null if absent. */
function metaFence(src: string): RegExpExecResult | null {
  return /(```toml meta\n)([\s\S]*?)(\n```)/.exec(src);
}
type RegExpExecResult = RegExpExecArray;

/** The meta `namespace` value (raw, possibly entity-encoded), or null if absent. */
function metaNamespace(src: string): string | null {
  const fence = metaFence(src);
  if (!fence) return null;
  const m = /^[ \t]*namespace[ \t]*=[ \t]*"([^"]*)"/m.exec(fence[2]!);
  return m ? m[1]! : null;
}


/**
 * The command word a `<<` … `>>` opens with, definition registers named.
 *
 * TiddlyWiki's parameter-list syntax takes `:` and refuses `=`, so a definition keeps the colon it carries.
 * The pragma spellings all lead with a backslash; wehe, kumu and helu spell the same registers as sigils.
 */
const DEFINITION_HEAD = /^[~^!]?\s*(\\[A-Za-z_]|wehe\b|kumu\b|helu\b)/;

/** A colon separates a parameter only where a QUOTED value follows — a scheme colon never does. */
const COLON_PARAM = /\b([A-Za-z0-9_-]+):(?=["']|\[\[)/g;

/**
 * The framing opener's two ends, positional.
 *
 * `pranala` and `lares aim` name theirs; the four framing codes carried a bare `?` and a bare address with
 * the bearing arrow between. The arrow stays — TiddlyWiki parses it as an unnamed positional — and the ends
 * it terminates take the names every other sigil already gives them.
 */
const FRAME_OPEN_ENDS =
  /(<<\^ code="&#x(?:0001|0011);"(?:[ \t]+namespace="[^"]*")?[ \t]+)\?([ \t]*->[ \t]*)(\S+)([ \t]*>>)/g;

/** The closer states one end: the arrow reaches an unresolved address. */
const FRAME_CLOSE_ENDS = /(<<\^ code="&#x(?:0004|0014);"[ \t]*->[ \t]*)\?([ \t]*>>)/g;

/**
 * Rewrite every CALL-site colon separator to `=`, leaving definitions and scheme colons untouched.
 *
 * Exported so a corpus sweep moves the graph by the same law the gate reads it with.
 *
 * A sigil closes on the line it opens. A match crossing a newline reaches from a bare `<<` in prose to the
 * next sigil and rewrites everything between — eight files on this graph moved that way.
 */
export function normalizeParamSeparators(src: string): { text: string; moved: number } {
  let moved = 0;
  const text = src.replace(/<<([^\n>]*(?:>(?!>)[^\n>]*)*)>>/g, (whole, inner: string) => {
    if (DEFINITION_HEAD.test(inner)) return whole;
    const next = inner.replace(COLON_PARAM, "$1=");
    if (next === inner) return whole;
    moved += 1;
    return `<<${next}>>`;
  });
  return { text, moved };
}

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

  // ── 0. The declaration names the grammar, then the address ───────────────
  //
  // A carrier opening with the address alone parses, renders back to something else, and reads as
  // content drift in a round-trip witness — three library indexes arrived that way from two writers
  // that each spelled the line by hand. The one authority lives beside the type constant; a carrier
  // holding a shorter or older declaration takes it here, which is what a normalize gesture is for.
  const decl = /^<<!DOCTYPE[^>\n]*>>/m.exec(text);
  if (decl && decl[0] !== DECLARATION) {
    text = text.slice(0, decl.index) + DECLARATION + text.slice(decl.index + decl[0].length);
    notes.push("declaration: took the grammar's name before its address");
    flags.push("declaration");
  }
  // ABSENCE RAISES NOTHING HERE. This gesture repairs what a carrier wrote; whether a `.mem` on disk
  // must carry a declaration at all is the doctype witness's question, and normalize also runs over
  // fragments and authoring drafts that legitimately carry no head.

  // ── 1. SOH opener (namespace embed + spacing) ────────────────────────────
  const nsRaw = metaNamespace(text);
  const want = nsRaw === null ? "" : decodeEntities(nsRaw).trim();
  const soh = SOH_OPENER_RE.exec(text);
  if (soh) {
    // BOTH SPELLINGS READ, ONE SPELLING WRITES. A head stating named params reads from them; a head
    // from before the params carries its namespace as bare glyphs in front of the control entity, and
    // this is the door that lifts it. Normalizing is exactly where a grammar migration belongs — the
    // reader stays forgiving so a carrier written under either form still arrives, and every carrier
    // that passes through leaves in the current one.
    const code = soh[2] ?? soh[5]!;
    const have = soh[3] ?? soh[4]?.trim() ?? "";
    // Canonical opener: the control head, the code param, then the namespace param where the meta
    // declares one. Comparing the WHOLE matched head rather than the namespace alone canonicalizes
    // spacing and param order together, so one rewrite settles every drift the head can carry.
    const rebuilt = `${soh[1]} code="${code}"${want ? ` namespace="${want}"` : ""}`;
    if (soh[0]! !== rebuilt) {
      text = text.slice(0, soh.index) + rebuilt + text.slice(soh.index + soh[0]!.length);
      notes.push(have !== want
        ? (want ? `SOH namespace homed to "${want}" (from meta)` : `SOH namespace cleared (meta declares none)`)
        : `SOH opener spacing canonicalized`);
    }
  }

  // ── 2. Sigil close spacing ───────────────────────────────────────────────
  //
  // BOTH SPELLINGS READ, ONE SPELLING WRITES — the same law the opener above carries. `lar-sigil`
  // matches a close with or without the space before `>>`, so a carrier written either way arrives;
  // every carrier that passes through leaves tight. The match shape is the one clause 3 states: a
  // sigil closes on the line it opens, and a match crossing a newline reaches from a bare `<<` in
  // prose to the next sigil and rewrites everything between.
  {
    let tightened = 0;
    text = text.replace(/<<([^\n>]*(?:>(?!>)[^\n>]*)*)>>/g, (whole, inner: string) => {
      const trimmed = inner.replace(/[ \t]+$/, "");
      if (trimmed === inner) return whole;
      tightened += 1;
      return `<<${trimmed}>>`;
    });
    if (tightened > 0) {
      notes.push(`sigil close spacing: ${tightened} close${tightened === 1 ? "" : "s"} tightened`);
    }
  }

  // ── 3. Named-parameter separator (call sites only) ───────────────────────
  //
  // The memetic standard writes key=value; TiddlyWiki reads both spellings, so a carrier holding the colon
  // renders identically and only its spelling drifts. A DEFINITION stays untouched — a parameter list refuses
  // `=` — and so does every scheme colon, which the quoted-value test excludes by shape.
  const sep = normalizeParamSeparators(text);
  text = sep.text;
  if (sep.moved > 0) {
    notes.push(`named parameter separator: ${sep.moved} call site${sep.moved === 1 ? "" : "s"} took the equals sign`);
  }

  // ── 4. Framing ends (positional → named) ─────────────────────────────────
  let ends = 0;
  text = text.replace(FRAME_OPEN_ENDS, (_m, head: string, arrow: string, target: string, tail: string) => {
    ends += 1;
    return `${head}from=?${arrow}to=${target}${tail}`;
  });
  text = text.replace(FRAME_CLOSE_ENDS, (_m, head: string, tail: string) => {
    ends += 1;
    return `${head}to=?${tail}`;
  });
  if (ends > 0) notes.push(`framing ends: ${ends} sigil${ends === 1 ? "" : "s"} named from= and to=`);

  return { text, changed: text !== src, notes, flags };
}

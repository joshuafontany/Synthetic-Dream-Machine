/**
 * carrier-edges — every address a carrier points AT, in each form the grammar spells one.
 *
 * ── WHY THE GRAPH NEEDS ITS OWN READING ─────────────────────────────────────────────────────────
 * A `lar:` URI names; it does not fetch. So a carrier whose target moved keeps rendering, keeps
 * round-tripping, and keeps passing every gate this tree stands — `carrier-shape` asks whether a file
 * is whole, `meme-coordinates` asks whether its own two coordinates agree, `bcc` asks whether its bytes
 * match their check. **None of them looks outward.** An edge that resolves to nothing is invisible to
 * all three at once.
 *
 * Measured: retiring one carrier and moving two left 66 references naming addresses that no longer
 * answered, across 28 carriers — found by hand, after the commit. Folding 37 carriers up one level
 * touched 197 references and broke none, because that scan ran BEFORE the move. This is that scan,
 * made an instrument instead of a habit.
 *
 * ── FIVE SPELLINGS, ONE RELATION ────────────────────────────────────────────────────────────────
 * A reader counting only `loulou` sees 149 of the corpus's 194 dangling edges. The other 45 ride
 * `pranala` and two wikilink forms — and an instrument that misses a form reports a clean move over a
 * broken one. Every form a carrier can name an address in belongs here.
 *
 * Measured over 614 carriers: 2,197 edges — loulou 1,851 · wikilink 255 · pranala 84 · kahea 7.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

import { fencedSpans, inMask } from "./meme-ast/fence-mask.js";

/** How a carrier spelled the reference. */
export type EdgeForm = "loulou" | "pranala" | "kahea" | "wikilink" | "md-target";

export interface CarrierEdge {
  /**
   * The address named, fragment stripped — what a resolver would look up.
   *
   * An `md-target` edge names a FILE rather than an address, so it has none: a reader cannot resolve
   * it without guessing which carrier that file became, and a guess is what the resolver must not do.
   */
  readonly address: string | null;
  /** The address as written, fragment included. */
  readonly written: string;
  readonly form: EdgeForm;
}

const PATTERNS: ReadonlyArray<readonly [EdgeForm, RegExp]> = [
  ["loulou",   /<<~\s*loulou\s+lar:\/\/\/(\S+?)\s*>>/g],
  // A `>` CLOSES A CALL ONLY WHEN A SECOND ONE FOLLOWS — TiddlyWiki's own `reUnquotedAttribute` law. A
  // `pranala` states its target past a bearing arrow, so a scan of `[^>]*?` stops at that arrow and the
  // sigil never reaches its own address — silently, as a form that simply reports no edges. Every scan in this grammar spells it
  // `(?:[^>]|>(?!>))*?`, for that reason. Measured: without it this reader found 0 of the corpus's 84 `pranala` edges, and reported
  // 163 dangling where 194 stand.
  //
  // AN EDGE IS THE END IT POINTS AT. A `pranala` names both ends, and only `to=` is the edge — `from=`
  // is where the carrier already stands. Anchored on `to=` rather than on position, because a scan for
  // the first address after the sigil reads whichever end is written first: it agrees wherever the
  // source is `?` and inverts wherever the source is an address, counting a carrier's own ground as a
  // dangling edge while the target it points at goes uncounted. Position is not the relation.
  ["pranala",  /<<~\s*pranala(?:[^>]|>(?!>))*?\bto=lar:\/\/\/(\S+?)[\s>]/g],
  ["kahea",    /<<~\s*kahea(?:[^>]|>(?!>))*?lar:\/\/\/(\S+?)[\s>]/g],
  ["wikilink", /\[\[[^\]|]*\|lar:\/\/\/([^\]]+)\]\]/g],
  ["wikilink", /\[\[lar:\/\/\/([^\]|]+)\]\]/g],
  // THE FORM THAT PREDATES THE ADDRESS. Before the corpus poured to `.mem`, a carrier linked its
  // neighbours by FILE. Those links still stand, and a reader counting only `lar:///` targets does not
  // see them — 70 of them sat outside this instrument while it reported the graph whole.
  //
  // They carry no address, so they never count as dangling and never count as resolving. They are
  // named so a sweep can find them, and left unresolved because matching a file to a carrier means
  // guessing which one it became.
  ["md-target", /\[\[[^\]|]*\|((?:\.\.?\/)*[^\]:]*\.md)\]\]/g],
];

/**
 * Every edge a carrier writes, read through the fence mask.
 *
 * The specification memes teach these forms by quoting them, so an unmasked scan reports a lesson's
 * example as a broken link and sends a reader chasing an address nobody meant to stand.
 */
export function readCarrierEdges(text: string): CarrierEdge[] {
  const spans = fencedSpans(text);
  const out: CarrierEdge[] = [];
  for (const [form, re] of PATTERNS) {
    const g = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = g.exec(text)) !== null) {
      if (inMask(spans, m.index)) continue;
      // A trailing period or comma belongs to the prose, never to the name.
      const written = m[1]!.replace(/[.,;]+$/, "");
      out.push({ written, address: form === "md-target" ? null : written.split("#")[0]!, form });
    }
  }
  return out;
}

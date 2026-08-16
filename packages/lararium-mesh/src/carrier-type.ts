/**
 * carrier-type — the media type a `.mem` carries, declared once.
 *
 * ── WHY THIS COLLAPSES AND THE PATTERNS AROUND IT DO NOT ────────────────────────────────────────
 * Four mechanisms dispatch on this string, each a different one: the TW5 parser module exports under
 * it, the deserializer module exports under it, `registerFileType` binds an extension to it, and a
 * record's stored `type` field is compared against it. A fifth reads it back off disk from a carrier's
 * own iam block.
 *
 * They agree only by hand. Spelled five ways, a change lands in four of them and the fifth refuses
 * quietly — a record whose type does not match simply stops projecting, with no throw and no
 * diagnostic. So the STRINGS collapse here; each mechanism keeps its own binding.
 *
 * ── WHY THE READ SIDE STAYS WIDE, PERMANENTLY ───────────────────────────────────────────────────
 * `+tiddlywiki` is an RFC 6839 structured syntax suffix: it states that this syntax is BUILT ON TW5
 * wikitext, in the form a media-type registry already understands. The suffixed name is what a carrier
 * writes from here on.
 *
 * The unsuffixed name is what every carrier written before it says, and what a content-addressed store
 * holds under a path named by those bytes. Rewriting those re-addresses them. So the reader takes both
 * names for good — not as a migration scaffold with an end date, but because a carrier authored under
 * either spelling names the same syntax and always did.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext#media-type
 */

/** What a carrier written from here on declares, and what every writer emits. */
export const CARRIER_TYPE = "text/x-memetic-wikitext+tiddlywiki";

/** The name carriers written before the suffix carry. Read forever; never emitted. */
export const CARRIER_TYPE_UNSUFFIXED = "text/x-memetic-wikitext";

/** Every spelling a reader admits, canonical first — the order dispatch registration follows. */
export const CARRIER_TYPES: readonly string[] = [CARRIER_TYPE, CARRIER_TYPE_UNSUFFIXED] as const;

/** Whether a stored `type` names a memetic carrier under any spelling this grammar has used. */
export function isCarrierType(type: unknown): boolean {
  return typeof type === "string" && CARRIER_TYPES.includes(type);
}
